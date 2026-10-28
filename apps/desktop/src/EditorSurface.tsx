/**
 * SPDX-License-Identifier: Apache-2.0
 *
 * Tiptap authoring surface coordinated by DesktopStudioCoordinator
 * (canonical BookSession + @openbook/workflow + @openbook/importer + ProjectPersistence).
 * Tiptap JSON is editor transport only and is never persisted.
 */
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Link from "@tiptap/extension-link";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { bookToSemanticDocument } from "@openbook/semantic-document";
import { nextStage, WORKFLOW_STAGES } from "@openbook/workflow";
import type { TextImportSource } from "@openbook/importer";
import {
  normalizeTipTapDoc,
  semanticDocumentToTipTapJson,
  type TipTapDocJSON,
} from "./domain/editorAdapter";
import { DesktopStudioCoordinator } from "./domain/desktopStudioCoordinator";
import { SqliteProjectPersistence } from "./persistence/sqlitePersistence";
import type { ProjectSummary } from "./persistence/types";
import { DesktopExportController } from "./host/desktopExportController";
import { createTauriExportSaveHost } from "./host/createTauriExportSaveHost";
import { createGuidedStartHost } from "./host/createGuidedStartHost";
import PublishStep from "./ui/PublishStep";
import GuidedStartWizard from "./ui/GuidedStartWizard";
import WritingStudioToolbar from "./ui/WritingStudioToolbar";
import WritingStudioFindPanel from "./ui/WritingStudioFindPanel";
import WritingStudioImageButton from "./ui/WritingStudioImageButton";
import DesignStudioChoices from "./ui/DesignStudioChoices";
import MetadataWizardFields from "./ui/MetadataWizardFields";
import StructureStudioNavPreview from "./ui/StructureStudioNavPreview";
import StructureStudioRail from "./ui/StructureStudioRail";
import StudioShellFrame from "./ui/StudioShellFrame";
import StudioOutline from "./ui/StudioOutline";
import StudioGuidePanel from "./ui/StudioGuidePanel";
import StudioStartScreen from "./ui/StudioStartScreen";
import { createTipTapEditorCommandPort } from "./host/createTipTapEditorCommandPort";
import { createWritingStudioImagePickPort } from "./host/createWritingStudioImagePickPort";
import { createWordFilePickPort } from "./host/createWordFilePickPort";
import { importWordFile, type WordImportSummary } from "./workflow/domain/wordImport";
import { createWritingStudioToolbarAdapter } from "./workflow/domain/writingStudioToolbarAdapter";
import { createWritingStudioQueryAdapter } from "./workflow/domain/writingStudioQueryAdapter";
import { createWritingStudioImageAdapter } from "./workflow/domain/writingStudioImageAdapter";
import { createDesignStudioChoices } from "./workflow/domain/designStudioChoices";
import { createMetadataWizardFields } from "./workflow/domain/metadataWizardFields";
import { createStructureStudioMatterRail } from "./workflow/domain/structureStudioMatterRail";
import { projectBookNavigation } from "./workflow/domain/structureStudioNavPreview";
import {
  STUDIO_STEPS,
  deriveStudioProgress,
  deriveStudioStepStatuses,
  nextStudioStep,
  type StudioStepId,
} from "./workflow/domain/studioShellContract";
import { STUDIO_GUIDE, evaluateStudioGuideChecklist } from "./workflow/domain/studioShellGuide";
import {
  STUDIO_BOOK_TYPES,
  findDesignPresetForBookType,
  type StudioBookType,
} from "./workflow/domain/studioShellStart";
import {
  isAuthorSafeText,
  toAuthorError,
  toAuthorMessage,
  type StudioErrorContext,
} from "./workflow/domain/studioShellErrors";
import type { GuidedStartPath } from "./workflow/domain/guidedStartContract";
import {
  buildStudioShellSnapshot,
  describeSaveStatus,
  shellBookTitle,
} from "./workflow/domain/studioShellStatus";
import { buildStudioOutline, isOutlineChapter } from "./workflow/domain/studioShellOutline";
import { stagesToReachBookCheck, summarizeBookCheck } from "./workflow/domain/studioShellPublish";
import {
  WRITING_STUDIO_EDITOR_UNAVAILABLE,
  WRITING_STUDIO_EMPTY_CHAPTERS,
  WRITING_STUDIO_NO_SECTION,
} from "./workflow/domain/writingStudioUx";
import englishFixture from "./fixtures/english-tiptap.json";

type ProjectionStatus = "idle" | "ok" | "error";

function seedDraft(coordinator: DesktopStudioCoordinator, fixture: TipTapDocJSON) {
  const first = coordinator.listChapters()[0];
  if (first) {
    coordinator.getSession().updateSectionTitle(first.id, "Chapter 1");
    coordinator.selectSection(first.id);
    coordinator.applyActiveSectionTipTap(fixture);
  }
  coordinator.getSession().addSection({ matter: "main", title: "Chapter 2" });
  const chapters = coordinator.listChapters();
  if (chapters[0]) coordinator.selectSection(chapters[0].id);
}

function createUiCoordinator(): DesktopStudioCoordinator {
  const coordinator = new DesktopStudioCoordinator({
    persistence: new SqliteProjectPersistence(),
    idSeed: "desktop-ui-draft",
  });
  seedDraft(coordinator, englishFixture as TipTapDocJSON);
  return coordinator;
}

export interface EditorSurfaceProps {
  /** App-level diagnostics shown in the shell's Diagnostics drawer. */
  readonly diagnostics?: ReactNode;
}

export default function EditorSurface({ diagnostics }: EditorSurfaceProps = {}) {
  const [coordinator] = useState(() => createUiCoordinator());
  const [activeStep, setActiveStep] = useState<StudioStepId>("write");
  const [diagnosticsOpen, setDiagnosticsOpen] = useState(false);
  const [focusMode, setFocusMode] = useState(false);
  const [guideOpen, setGuideOpen] = useState(true);
  /** ADR-0039 Slice 6: the app opens on the start screen. */
  const [view, setView] = useState<"start" | "studio">("start");
  const [pickedBookType, setPickedBookType] = useState<StudioBookType | null>(null);
  const [exportController] = useState(
    () =>
      new DesktopExportController({
        exportSaveHost: createTauriExportSaveHost(coordinator),
        getSuggestedTitle: () => coordinator.getBook().metadata.title || "Untitled Book",
        getStage: () => coordinator.getState().stage,
      }),
  );
  const [guidedStartHost] = useState(() => createGuidedStartHost({ coordinator }));
  const [studio, setStudio] = useState(() => coordinator.getState());
  const refresh = () => setStudio(coordinator.getState());

  const [status, setStatus] = useState<ProjectionStatus>("idle");
  const [detail, setDetail] = useState("Edit to project through BookSession → Book");
  const [roundTrip, setRoundTrip] = useState("Not checked");
  const [sessionNote, setSessionNote] = useState("");
  const [persistStatus, setPersistStatus] = useState("");
  /** ADR-0039 Slice 7: original text of the last problem, for Diagnostics only. */
  const [lastProblem, setLastProblem] = useState<string | null>(null);
  const noteError = (err: unknown, context: StudioErrorContext): string => {
    const { message, detail } = toAuthorError(err, context);
    setLastProblem(detail);
    return message;
  };
  const [projectList, setProjectList] = useState<ProjectSummary[]>([]);
  const [importText, setImportText] = useState("");
  const [importFormat, setImportFormat] = useState<TextImportSource["format"]>("markdown");
  const [importFilename, setImportFilename] = useState("manuscript.md");
  const [importNote, setImportNote] = useState("Choose a file or paste text, then add it to your book.");
  /** ADR-0040 Slice 4: Word (.docx) import from the start screen and Write. */
  const [wordPicker] = useState(() => createWordFilePickPort());
  const [wordImportBusy, setWordImportBusy] = useState(false);
  const [wordImportMessage, setWordImportMessage] = useState("");
  const [wordImportSummary, setWordImportSummary] = useState<WordImportSummary | null>(null);
  const switchingRef = useRef(false);

  const chapters = coordinator.listChapters();

  const editorRef = useRef<ReturnType<typeof useEditor>>(null);
  const editor = useEditor({
    extensions: [
      StarterKit,
      Link.configure({
        openOnClick: false,
        autolink: true,
        defaultProtocol: "https",
      }),
    ],
    content: coordinator.activeSectionToTipTap().doc,
    editorProps: {
      attributes: {
        class: "tiptap-surface",
        "data-testid": "tiptap-editor",
        lang: "en",
      },
    },
  });
  editorRef.current = editor;

  const [writingStudioToolbar] = useState(() =>
    createWritingStudioToolbarAdapter({
      getEditor: () => {
        const current = editorRef.current;
        return current ? createTipTapEditorCommandPort(current) : null;
      },
    }),
  );
  const [writingStudioQuery] = useState(() =>
    createWritingStudioQueryAdapter({
      bookSource: { getBook: () => coordinator.getBook() },
    }),
  );
  const [writingStudioImage] = useState(() =>
    createWritingStudioImageAdapter({
      pick: createWritingStudioImagePickPort(),
      coordinator: {
        getBook: () => coordinator.getBook(),
        getStage: () => coordinator.getState().stage,
        advanceStage: () => coordinator.advanceStage(),
        insertImageBlock: (input) => coordinator.insertImageBlock(input),
      },
    }),
  );
  const [structureRail] = useState(() => {
    const session = () => coordinator.getSession();
    return createStructureStudioMatterRail({
      getBook: () => coordinator.getBook(),
      addSection: (params) => session().addSection(params),
      updateSectionTitle: (sectionId, title) =>
        session().updateSectionTitle(sectionId, title),
      reorderSection: (matter, fromIndex, toIndex) =>
        session().reorderSection(matter, fromIndex, toIndex),
      moveSection: (sectionId, targetMatter, targetIndex) =>
        session().moveSection(sectionId, targetMatter, targetIndex),
      updateSectionRole: (sectionId, role) =>
        session().updateSectionRole(sectionId, role),
    });
  });
  const [designChoices] = useState(() => {
    const session = () => coordinator.getSession();
    return createDesignStudioChoices({
      getBook: () => coordinator.getBook(),
      updateTheme: (theme) => session().updateTheme(theme),
      updateTypography: (typography) => session().updateTypography(typography),
    });
  });
  const [metadataFields] = useState(() =>
    createMetadataWizardFields({
      getBook: () => coordinator.getBook(),
      updateMetadata: (metadata) => coordinator.getSession().updateMetadata(metadata),
    }),
  );

  useEffect(() => {
    void coordinator
      .listProjects()
      .then((listed) => {
        setProjectList(listed);
        setPersistStatus("");
      })
      .catch((err: unknown) => {
        setPersistStatus(noteError(err, "save"));
      });
    return () => {
      void coordinator.close();
    };
  }, [coordinator]);

  const projectFromBook = (warningsCount: number) => {
    const book = coordinator.getBook();
    const selectedId = coordinator.getState().selectedSectionId;
    if (!selectedId) {
      setStatus("error");
      setDetail(WRITING_STUDIO_NO_SECTION);
      setRoundTrip("n/a");
      return;
    }

    const back = bookToSemanticDocument(book);
    const sdmChapter = back.sections.find((s) => s.id === selectedId);
    let matched = false;
    if (sdmChapter) {
      const tipFromBook = semanticDocumentToTipTapJson({
        ...back,
        sections: [sdmChapter],
      }).doc;
      const tipFromSession = coordinator.activeSectionToTipTap().doc;
      matched =
        JSON.stringify(normalizeTipTapDoc(tipFromBook)) ===
        JSON.stringify(normalizeTipTapDoc(tipFromSession));
    }

    setStatus("ok");
    setDetail(
      `Tiptap → EditorAdapter → BookSession (${coordinator.listChapters().length} ch) → Book v${book.schemaVersion}; warnings=${warningsCount}`,
    );
    setRoundTrip(
      matched
        ? "Selected chapter: BookSession → Book → SDM → Tiptap match"
        : "round-trip mismatch",
    );
  };

  useEffect(() => {
    if (!editor) return;

    const onUpdate = () => {
      if (switchingRef.current) return;
      const json = editor.getJSON() as TipTapDocJSON;
      try {
        const warnings = coordinator.applyActiveSectionTipTap(json);
        refresh();
        projectFromBook(warnings.length);
      } catch (err) {
        setStatus("error");
        setDetail(noteError(err, "edit"));
      }
    };

    onUpdate();
    editor.on("update", onUpdate);
    return () => {
      editor.off("update", onUpdate);
    };
  }, [editor]);

  const flushEditorIntoSession = (): boolean => {
    if (!editor) return true;
    try {
      coordinator.applyActiveSectionTipTap(editor.getJSON() as TipTapDocJSON);
      refresh();
      return true;
    } catch (err) {
      setSessionNote(noteError(err, "edit"));
      return false;
    }
  };

  const loadSectionIntoEditor = () => {
    if (!editor) return;
    switchingRef.current = true;
    const { doc } = coordinator.activeSectionToTipTap();
    editor.commands.setContent(doc, { emitUpdate: false });
    switchingRef.current = false;
    projectFromBook(0);
    refresh();
  };

  const refreshProjectList = async () => {
    try {
      setProjectList(await coordinator.listProjects());
    } catch {
      // persistStatus is set by the caller on failure
    }
  };

  const onSelectChapter = (chapterId: string) => {
    if (!flushEditorIntoSession()) return;
    try {
      coordinator.selectSection(chapterId);
      setSessionNote(
        `Selected “${coordinator.listChapters().find((c) => c.id === chapterId)?.title ?? chapterId}”`,
      );
      loadSectionIntoEditor();
    } catch (err) {
      setSessionNote(noteError(err, "edit"));
    }
  };

  const onCreateChapter = () => {
    if (!flushEditorIntoSession()) return;
    const n = coordinator.listChapters().length + 1;
    try {
      coordinator.getSession().addSection({ matter: "main", title: `Chapter ${n}` });
      setSessionNote(`Created “Chapter ${n}”`);
      loadSectionIntoEditor();
    } catch (err) {
      setSessionNote(noteError(err, "edit"));
    }
  };

  const onRenameChapter = () => {
    const current = coordinator
      .listChapters()
      .find((c) => c.id === coordinator.getState().selectedSectionId);
    if (!current) return;
    const nextTitle = window.prompt("Rename chapter", current.title);
    if (nextTitle === null) return;
    if (!flushEditorIntoSession()) return;
    try {
      coordinator.getSession().updateSectionTitle(current.id, nextTitle);
      setSessionNote(`Renamed to “${nextTitle.trim() || current.title}”`);
      projectFromBook(0);
      refresh();
    } catch (err) {
      setSessionNote(noteError(err, "edit"));
    }
  };

  const onDeleteChapter = () => {
    if (!flushEditorIntoSession()) return;
    const id = coordinator.getState().selectedSectionId;
    if (!id) return;
    try {
      coordinator.getSession().removeSection(id);
      setSessionNote("Chapter deleted");
      loadSectionIntoEditor();
    } catch (err) {
      setSessionNote(noteError(err, "edit"));
    }
  };

  const onNewBook = () => {
    clearWordImport();
    void coordinator.newProject("Desktop editor draft").then(() => {
      seedDraft(coordinator, englishFixture as TipTapDocJSON);
      setSessionNote("Started a new unsaved book session");
      setPersistStatus("New book ready. Use Save when you want to keep it.");
      loadSectionIntoEditor();
    });
  };

  const onSaveProject = async () => {
    if (!flushEditorIntoSession()) return;

    let projectName: string | undefined;
    if (!coordinator.getState().binding) {
      const suggested = coordinator.getBook().metadata.title || "Untitled Project";
      const entered = window.prompt("Save project as", suggested);
      if (entered === null) return;
      projectName = entered;
    }

    try {
      await coordinator.saveProject(projectName);
      refresh();
      const binding = coordinator.getState().binding;
      setPersistStatus(
        binding
          ? `Saved “${binding.projectName}”.`
          : "Saved.",
      );
      await refreshProjectList();
    } catch (err) {
      setPersistStatus(noteError(err, "save"));
    }
  };

  const onOpenProject = async () => {
    try {
      await refreshProjectList();
      const listed = await coordinator.listProjects();
      if (listed.length === 0) {
        setPersistStatus("No project selected. No saved projects available.");
        return;
      }

      const choices = listed.map((p, i) => `${i + 1}. ${p.name} (${p.id})`).join("\n");
      const entered = window.prompt(
        `Open project — enter number or project id:\n${choices}`,
        "1",
      );
      if (entered === null) return;
      const trimmed = entered.trim();
      const asIndex = Number.parseInt(trimmed, 10);
      const projectId =
        Number.isFinite(asIndex) && asIndex >= 1 && asIndex <= listed.length
          ? listed[asIndex - 1]!.id
          : trimmed;

      if (!projectId) {
        setPersistStatus("No project selected to open.");
        return;
      }

      await coordinator.openProject(projectId, coordinator.getState().selectedSectionId ?? undefined);
      const opened = coordinator.getState().binding;
      setPersistStatus(
        opened
          ? `Opened “${opened.projectName}”.`
          : "Opened your book.",
      );
      clearWordImport();
      setSessionNote(opened ? `Opened “${opened.projectName}”` : "Opened project");
      loadSectionIntoEditor();
    } catch (err) {
      setPersistStatus(noteError(err, "open"));
    }
  };

  const onAdvanceStage = () => {
    const to = nextStage(studio.stage);
    if (!to) return;
    try {
      coordinator.transitionStage(to);
      refresh();
    } catch (err) {
      setSessionNote(noteError(err, "edit"));
    }
  };

  /** ADR-0039 Slice 4: move forward to the check, run it, and unlock export when clean. */
  const onCheckBook = async () => {
    if (!flushEditorIntoSession()) {
      throw new Error("Cannot check the book: editor content could not be applied.");
    }
    try {
      for (const stage of stagesToReachBookCheck(coordinator.getState().stage)) {
        coordinator.transitionStage(stage);
      }
      const report = await coordinator.runValidation();
      if (report.summary.isClean && coordinator.getState().stage === "VALIDATION") {
        coordinator.transitionStage("PREVIEW");
      }
    } finally {
      refresh();
    }
  };

  const onPickImportFile = (file: File | undefined) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const raw = typeof reader.result === "string" ? reader.result : "";
      setImportText(raw.replace(/^\uFEFF/, ""));
      setImportFilename(file.name);
      const lower = file.name.toLowerCase();
      if (lower.endsWith(".md") || lower.endsWith(".markdown")) {
        setImportFormat("markdown");
      } else if (lower.endsWith(".txt")) {
        setImportFormat("text");
      }
    };
    reader.readAsText(file, "UTF-8");
  };

  const runImport = async (mode: "new-project" | "append-sections") => {
    const content = importText.replace(/^\uFEFF/, "");
    if (!content.trim()) {
      setImportNote("Choose a file or paste some text first.");
      return;
    }
    try {
      const result = await coordinator.importContent(
        { format: importFormat, content, filename: importFilename },
        { mode },
      );
      setImportNote(
        result.sectionCount === 1
          ? "Added 1 chapter. Use Save to keep it."
          : `Added ${result.sectionCount} chapters. Use Save to keep them.`,
      );
      setSessionNote(`Imported “${coordinator.getBook().metadata.title}”`);
      setWordImportSummary(null);
      loadSectionIntoEditor();
      refresh();
    } catch (err) {
      setImportNote(noteError(err, "import"));
      refresh();
    }
  };

  /** New book from the start screen, or extra chapters from Write; the summary shows in the Guide. */
  /** A Word import's summary and start-screen note belong to the book they describe. */
  const clearWordImport = () => {
    setWordImportSummary(null);
    setWordImportMessage("");
  };
  const runWordImport = async (mode: "new-project" | "append-sections") => {
    if (mode === "append-sections" && !flushEditorIntoSession()) {
      setSessionNote("Couldn’t keep the text you are writing, so the Word file wasn’t added. Try again.");
      return;
    }
    setWordImportBusy(true);
    setWordImportMessage("");
    try {
      const outcome = await importWordFile(coordinator, wordPicker, mode);
      if (outcome.kind === "cancelled") return;
      if (outcome.kind === "failed") {
        setLastProblem(outcome.detail);
        if (mode === "new-project") setWordImportMessage(outcome.message);
        else setSessionNote(outcome.message);
        refresh();
        return;
      }
      setWordImportSummary(outcome.summary);
      setGuideOpen(true);
      setSessionNote(`${outcome.summary.headline} Use Save to keep it.`);
      loadSectionIntoEditor();
      refresh();
      if (mode === "new-project") openStudio();
    } finally {
      setWordImportBusy(false);
    }
  };

  const validationReport = coordinator.getValidationReport();
  const binding = studio.binding;

  const shellBook = coordinator.getBook();
  const shellSnapshot = buildStudioShellSnapshot({
    book: shellBook,
    bookWordCount: writingStudioQuery.getWordCounts().bookWordCount,
    validationReport,
    cover: "unavailable",
  });
  const shellSteps = deriveStudioStepStatuses(shellSnapshot);
  const activeStepLabel =
    STUDIO_STEPS.find((step) => step.id === activeStep)?.label ?? "This step";
  const outlineGroups = buildStudioOutline(
    shellBook,
    (sectionId) => writingStudioQuery.getWordCounts(sectionId).sectionWordCount,
  );
  const nextStep = nextStudioStep(activeStep);
  const selectStep = (step: StudioStepId) => {
    setFocusMode(false);
    setActiveStep(step);
  };
  const openStudio = () => {
    setWordImportMessage("");
    setView("studio");
    selectStep("write");
  };
  const onGuidedStarted = (path: GuidedStartPath) => {
    clearWordImport();
    refresh();
    loadSectionIntoEditor();
    setSessionNote("Your book is ready.");
    setPersistStatus("");
    if (path === "new-book" && pickedBookType) {
      const applied = designChoices.applyPreset(findDesignPresetForBookType(pickedBookType));
      if (!applied.ok) setSessionNote(applied.message);
      refresh();
    }
    setPickedBookType(null);
    openStudio();
  };
  const openFromLibrary = async () => {
    const before = coordinator.getState().binding?.projectId;
    await onOpenProject();
    const after = coordinator.getState().binding?.projectId;
    if (after && after !== before) openStudio();
  };
  const startBlankBook = () => {
    onNewBook();
    openStudio();
  };
  const reportStatus = (message: string, kind: "ok" | "error") => {
    setSessionNote(message);
    if (kind === "error") {
      setStatus("error");
      setDetail(message);
    }
  };

  return (
    <>
    {view === "start" ? (
      <StudioStartScreen
        currentBookTitle={shellBookTitle(shellBook)}
        onContinue={openStudio}
        bookTypes={STUDIO_BOOK_TYPES}
        selectedBookTypeId={pickedBookType?.id ?? null}
        onPickBookType={(type) =>
          setPickedBookType((current) => (current?.id === type.id ? null : type))
        }
        onImportWord={() => void runWordImport("new-project")}
        wordImportBusy={wordImportBusy}
        wordImportMessage={wordImportMessage}
        start={
          <GuidedStartWizard
            key={pickedBookType?.id ?? "hub"}
            host={guidedStartHost}
            initialPath={pickedBookType ? "new-book" : null}
            prefill={
              pickedBookType
                ? { bookType: pickedBookType.bookType, language: pickedBookType.language }
                : undefined
            }
            onStarted={onGuidedStarted}
          />
        }
        library={
          <div className="studio-library">
            <div className="project-bar" aria-label="Project">
              <span className="project-binding" data-testid="project-binding">
                {binding
                  ? `Current book: ${binding.projectName}`
                  : "The current book isn’t saved yet. Use Save in the book’s top bar."}
              </span>
              <div className="project-actions">
                <button type="button" className="studio-btn" onClick={startBlankBook}>
                  New blank book
                </button>
                <button type="button" className="studio-btn" onClick={() => void openFromLibrary()}>
                  Open a saved book…
                </button>
              </div>
              <p className="detail" data-testid="persist-status">
                {persistStatus}
              </p>
              {projectList.length > 0 ? (
                <p className="note">
                  {projectList.length === 1 ? "1 saved book" : `${projectList.length} saved books`}
                </p>
              ) : null}
            </div>
          </div>
        }
      />
    ) : null}
    <div className="studio-view" hidden={view !== "studio"}>
    <StudioShellFrame
      title={shellBookTitle(shellBook)}
      saveStatus={describeSaveStatus({
        hasSaveLocation: binding !== null || studio.packageRoot !== null,
        isDirty: studio.isDirty,
        autosave: studio.autosave,
      })}
      steps={shellSteps}
      progress={deriveStudioProgress(shellSteps)}
      activeStep={activeStep}
      onSelectStep={selectStep}
      onExport={() => selectStep("publish")}
      onHome={() => setView("start")}
      onSave={() => void onSaveProject()}
      guideOpen={guideOpen}
      onToggleGuide={() => setGuideOpen((open) => !open)}
      guide={
        focusMode || !guideOpen ? undefined : (
          <StudioGuidePanel
            stepLabel={activeStepLabel}
            guide={STUDIO_GUIDE[activeStep]}
            checklist={evaluateStudioGuideChecklist(activeStep, shellSnapshot)}
            nextLabel={nextStep ? nextStep.label : null}
            onNext={() => {
              if (nextStep) selectStep(nextStep.id);
            }}
            importSummary={wordImportSummary}
            onDismissImportSummary={() => setWordImportSummary(null)}
          />
        )
      }
      outline={
        focusMode ? undefined : (
          <StudioOutline
            groups={outlineGroups}
            selectedId={studio.selectedSectionId}
            selectedIsChapter={isOutlineChapter(shellBook, studio.selectedSectionId)}
            canDeleteChapter={chapters.length > 1}
            onSelect={(sectionId) => {
              selectStep("write");
              onSelectChapter(sectionId);
            }}
            onAddChapter={() => {
              selectStep("write");
              onCreateChapter();
            }}
            onRenameChapter={onRenameChapter}
            onDeleteChapter={onDeleteChapter}
          />
        )
      }
      diagnosticsOpen={diagnosticsOpen}
      onToggleDiagnostics={() => setDiagnosticsOpen((open) => !open)}
      diagnostics={
        <>
          <section className="editor-diagnostics">
            <p className="detail" data-testid="last-problem">
              Last problem: {lastProblem ?? "none"}
            </p>
        <div className="project-bar" aria-label="Workflow stage">
          <span className="project-binding" data-testid="workflow-stage">
            Stage: {studio.stage} ({studio.jobStatus}
            {studio.activeJobId ? ` / ${studio.activeJobId}` : ""})
          </span>
          <ol className="workflow-stages">
            {WORKFLOW_STAGES.map((stage) => (
              <li
                key={stage}
                className={
                  stage === studio.stage ? "workflow-stage workflow-stage-active" : "workflow-stage"
                }
              >
                {stage}
              </li>
            ))}
          </ol>
          <div className="project-actions">
            <button
              type="button"
              onClick={onAdvanceStage}
              disabled={!nextStage(studio.stage)}
            >
              Next stage
            </button>
          </div>
        </div>
            <h2>Editor (Tiptap)</h2>
            <p className="note">
              Path: Tiptap → EditorAdapter → BookSession.getBook() → ProjectPersistence →
              SQLite. Tiptap JSON is never saved. Pipeline state is @openbook/workflow.
            </p>
            <p className={`status status-${status}`} data-testid="editor-projection-status">
              {status}
            </p>
            <p className="detail">{detail}</p>
            <p className="detail" data-testid="editor-roundtrip">
              {roundTrip}
            </p>
          </section>
          {diagnostics}
        </>
      }
    >
      {activeStep === "structure" ? (
        <section className="studio-step-panel" aria-label="Structure" data-testid="studio-structure-step">
          <StructureStudioRail
            rail={structureRail}
            onSelectSection={onSelectChapter}
            onChanged={() => {
              refresh();
              loadSectionIntoEditor();
            }}
            onStatus={reportStatus}
          />
          <StructureStudioNavPreview entries={projectBookNavigation(coordinator.getBook())} />
          <section className="studio-import" aria-label="Add chapters from a file">
            <h3>Add chapters from a file</h3>
            <div className="project-bar import-panel" aria-label="Import manuscript">
              <p className="note">
                Choose a Markdown or text file, or paste the text. Each heading becomes a new chapter
                at the end of your book.
              </p>
              <label className="import-file">
                File
                <input
                  type="file"
                  accept=".md,.markdown,.txt,text/markdown,text/plain"
                  data-testid="import-file"
                  onChange={(event) => onPickImportFile(event.target.files?.[0])}
                />
              </label>
              <label className="import-file">
                Format
                <select
                  value={importFormat}
                  data-testid="import-format"
                  onChange={(event) =>
                    setImportFormat(event.target.value === "text" ? "text" : "markdown")
                  }
                >
                  <option value="markdown">Markdown</option>
                  <option value="text">Plain text</option>
                </select>
              </label>
              <textarea
                className="import-source"
                data-testid="import-source"
                rows={6}
                spellCheck={false}
                value={importText}
                placeholder="# Chapter title&#10;&#10;Paste manuscript text…"
                onChange={(event) => setImportText(event.target.value)}
              />
              <div className="project-actions">
                <button
                  type="button"
                  data-testid="import-append"
                  onClick={() => void runImport("append-sections")}
                >
                  Add as new chapters
                </button>
              </div>
              <p className="detail" data-testid="import-status">
                {importNote}
              </p>
            </div>
          </section>
        </section>
      ) : null}
      {activeStep === "design" ? (
        <section className="studio-step-panel" aria-label="Design" data-testid="studio-design-step">
          <DesignStudioChoices choices={designChoices} onChanged={refresh} onStatus={reportStatus} />
        </section>
      ) : null}
      {activeStep === "details" ? (
        <section className="studio-step-panel" aria-label="Details" data-testid="studio-details-step">
          <MetadataWizardFields fields={metadataFields} onChanged={refresh} onStatus={reportStatus} />
        </section>
      ) : null}
      {activeStep === "cover" ? (
        <section className="studio-step-placeholder" data-testid="studio-step-placeholder">
          <h2>{activeStepLabel}</h2>
          <p>Adding a cover image is coming soon. You can still publish without one.</p>
        </section>
      ) : null}
      {activeStep === "publish" ? (
        <PublishStep
          summary={summarizeBookCheck(validationReport)}
          exportController={exportController}
          onCheck={onCheckBook}
          onOpenSection={(sectionId) => {
            selectStep("write");
            onSelectChapter(sectionId);
          }}
        />
      ) : null}
      <section
        className="editor-section"
        hidden={activeStep !== "write"}
        onKeyDown={(event) => {
          if (focusMode && event.key === "Escape") setFocusMode(false);
        }}
      >

        <div className="studio-write">
          <div className="studio-write-bar">
            <p className="detail studio-session-note" data-testid="chapter-session-note" role="status">
              {sessionNote}
            </p>
            <button
              type="button"
              className="studio-btn"
              aria-pressed={focusMode}
              onClick={() => setFocusMode((on) => !on)}
              data-testid="studio-focus-toggle"
              title={focusMode ? "Show everything again (Esc)" : "Hide everything except your page"}
            >
              {focusMode ? "Exit focus" : "Focus"}
            </button>
          </div>
          {chapters.length === 0 ? (
            <p
              className="note writing-studio-empty"
              data-testid="writing-studio-empty-chapters"
            >
              {WRITING_STUDIO_EMPTY_CHAPTERS}
            </p>
          ) : null}
          <div className="editor-main">
            {!studio.selectedSectionId ? (
              <p
                className="note writing-studio-empty"
                data-testid="writing-studio-no-section"
                role="status"
              >
                {WRITING_STUDIO_NO_SECTION}
              </p>
            ) : null}
            {!editor ? (
              <p
                className="note writing-studio-empty"
                data-testid="writing-studio-editor-unavailable"
                role="status"
              >
                {WRITING_STUDIO_EDITOR_UNAVAILABLE}
              </p>
            ) : null}
            <WritingStudioToolbar
              toolbar={writingStudioToolbar}
              disabled={!editor}
            />
            <div className="writing-studio-media-row">
              <WritingStudioImageButton
                imageAdapter={writingStudioImage}
                sectionId={studio.selectedSectionId}
                disabled={!editor}
                onInserted={() => {
                  loadSectionIntoEditor();
                  refresh();
                }}
                onStatus={(message, kind) => {
                  setSessionNote(message);
                  if (kind === "error") {
                    setStatus("error");
                    setDetail(message);
                  }
                }}
              />
              <button
                type="button"
                className="studio-btn"
                disabled={wordImportBusy}
                onClick={() => void runWordImport("append-sections")}
                data-testid="writing-studio-import-word"
                title="Add the chapters and pictures of a Word (.docx) file to the end of this book"
              >
                {wordImportBusy ? "Adding chapters…" : "Add chapters from a Word file"}
              </button>
            </div>
            <WritingStudioFindPanel
              queryAdapter={writingStudioQuery}
              sectionId={studio.selectedSectionId}
              onSelectHit={(hit) => onSelectChapter(hit.sectionId)}
            />
            <EditorContent editor={editor} />
          </div>
        </div>

        {status === "error" ? (
          <p className="detail" role="alert">
            {isAuthorSafeText(detail) ? detail : toAuthorMessage(detail, "edit")}
          </p>
        ) : null}
      </section>
    </StudioShellFrame>
    </div>
    </>
  );
}
