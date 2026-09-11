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
import { useEffect, useRef, useState } from "react";
import { bookToSemanticDocument } from "@openbook/semantic-document";
import { nextStage, WORKFLOW_STAGES } from "@openbook/workflow";
import type { ImportSource } from "@openbook/importer";
import {
  normalizeTipTapDoc,
  semanticDocumentToTipTapJson,
  type TipTapDocJSON,
} from "./domain/editorAdapter";
import {
  DesktopStudioCoordinator,
  DesktopStudioError,
} from "./domain/desktopStudioCoordinator";
import { SqliteProjectPersistence } from "./persistence/sqlitePersistence";
import type { ProjectSummary } from "./persistence/types";
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

export default function EditorSurface() {
  const [coordinator] = useState(() => createUiCoordinator());
  const [studio, setStudio] = useState(() => coordinator.getState());
  const refresh = () => setStudio(coordinator.getState());

  const [status, setStatus] = useState<ProjectionStatus>("idle");
  const [detail, setDetail] = useState("Edit to project through BookSession → Book");
  const [roundTrip, setRoundTrip] = useState("Not checked");
  const [sessionNote, setSessionNote] = useState("Canonical BookSession (Gate 8 Slice 2)");
  const [persistStatus, setPersistStatus] = useState("Persistence: not initialized");
  const [projectList, setProjectList] = useState<ProjectSummary[]>([]);
  const [importText, setImportText] = useState("");
  const [importFormat, setImportFormat] = useState<ImportSource["format"]>("markdown");
  const [importFilename, setImportFilename] = useState("manuscript.md");
  const [importNote, setImportNote] = useState("Paste Markdown or plain text, then import. Nothing is saved until Save.");
  const switchingRef = useRef(false);

  const chapters = coordinator.listChapters();
  const selected = chapters.find((c) => c.id === studio.selectedSectionId);

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

  useEffect(() => {
    void coordinator
      .listProjects()
      .then((listed) => {
        setProjectList(listed);
        setPersistStatus("Persistence: ready (SQLite ProjectPersistence)");
      })
      .catch((err: unknown) => {
        setPersistStatus(err instanceof Error ? err.message : String(err));
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
      setDetail("No section selected");
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
        setDetail(err instanceof Error ? err.message : String(err));
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
      setSessionNote(err instanceof Error ? err.message : String(err));
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
      setSessionNote(err instanceof Error ? err.message : String(err));
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
      setSessionNote(err instanceof Error ? err.message : String(err));
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
      setSessionNote(err instanceof Error ? err.message : String(err));
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
      setSessionNote(err instanceof Error ? err.message : String(err));
    }
  };

  const onNewBook = () => {
    void coordinator.newProject("Desktop editor draft").then(() => {
      seedDraft(coordinator, englishFixture as TipTapDocJSON);
      setSessionNote("Started a new unsaved book session");
      setPersistStatus("Persistence: ready (unsaved new book)");
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
          ? `Saved project “${binding.projectName}” (${binding.projectId}).`
          : "Saved project.",
      );
      await refreshProjectList();
    } catch (err) {
      setPersistStatus(err instanceof Error ? err.message : String(err));
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
          ? `Opened project “${opened.projectName}”.`
          : "Opened project.",
      );
      setSessionNote(opened ? `Opened “${opened.projectName}”` : "Opened project");
      loadSectionIntoEditor();
    } catch (err) {
      setPersistStatus(err instanceof Error ? err.message : String(err));
    }
  };

  const onAdvanceStage = () => {
    const to = nextStage(studio.stage);
    if (!to) return;
    try {
      coordinator.transitionStage(to);
      refresh();
    } catch (err) {
      setSessionNote(err instanceof Error ? err.message : String(err));
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
      setImportNote("Import source is empty.");
      return;
    }
    try {
      const result = await coordinator.importContent(
        { format: importFormat, content, filename: importFilename },
        { mode },
      );
      setImportNote(
        `Imported ${result.sectionCount} sections (${result.mode}); job ${coordinator.getState().jobStatus}. Save explicitly to persist.`,
      );
      setSessionNote(`Imported “${coordinator.getBook().metadata.title}”`);
      loadSectionIntoEditor();
      refresh();
    } catch (err) {
      const message = err instanceof DesktopStudioError ? err.message : err instanceof Error ? err.message : String(err);
      setImportNote(message);
      refresh();
    }
  };

  const binding = studio.binding;

  return (
    <section className="editor-section">
      <h2>Editor (Tiptap)</h2>
      <p className="note">
        Path: Tiptap → EditorAdapter → BookSession.getBook() → ProjectPersistence →
        SQLite. Tiptap JSON is never saved. Pipeline state is @openbook/workflow.
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

      <div className="project-bar import-panel" aria-label="Import manuscript">
        <span className="project-binding">Import (Markdown / plain text)</span>
        <p className="note">
          Coordinator receives pre-decoded Unicode only. Import stays in memory until Save.
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
            data-testid="import-new-project"
            onClick={() => void runImport("new-project")}
            disabled={studio.stage !== "IMPORT"}
            title={
              studio.stage !== "IMPORT"
                ? "New-project import is only allowed during IMPORT"
                : "Replace the in-memory session from this source"
            }
          >
            Import as new project
          </button>
          <button
            type="button"
            data-testid="import-append"
            onClick={() => void runImport("append-sections")}
          >
            Append sections
          </button>
        </div>
        <p className="detail" data-testid="import-status">
          {importNote}
        </p>
      </div>

      <div className="project-bar" aria-label="Project">
        <span className="project-binding" data-testid="project-binding">
          {binding
            ? `Project: ${binding.projectName}`
            : "Project: (unsaved — not selected)"}
        </span>
        <div className="project-actions">
          <button type="button" onClick={onNewBook}>
            New book
          </button>
          <button type="button" onClick={() => void onSaveProject()}>
            Save
          </button>
          <button type="button" onClick={() => void onOpenProject()}>
            Open
          </button>
        </div>
        <p className="detail" data-testid="persist-status">
          {persistStatus}
        </p>
        {projectList.length > 0 ? (
          <p className="note">Saved projects in DB: {projectList.length}</p>
        ) : null}
      </div>

      <div className="editor-layout">
        <aside className="chapter-panel" aria-label="Chapters">
          <h3>Chapters</h3>
          <ul className="chapter-list" data-testid="chapter-list">
            {chapters.map((chapter) => (
              <li key={chapter.id}>
                <button
                  type="button"
                  className={
                    chapter.id === studio.selectedSectionId
                      ? "chapter-item chapter-item-active"
                      : "chapter-item"
                  }
                  data-testid={`chapter-${chapter.id}`}
                  onClick={() => onSelectChapter(chapter.id)}
                >
                  {chapter.title}
                </button>
              </li>
            ))}
          </ul>
          <div className="chapter-actions">
            <button type="button" onClick={onCreateChapter}>
              New
            </button>
            <button type="button" onClick={onRenameChapter} disabled={!selected}>
              Rename
            </button>
            <button
              type="button"
              onClick={onDeleteChapter}
              disabled={chapters.length <= 1}
              title={
                chapters.length <= 1
                  ? "Cannot delete the last chapter"
                  : "Delete selected chapter"
              }
            >
              Delete
            </button>
          </div>
          <p className="detail" data-testid="chapter-session-note">
            {sessionNote}
          </p>
        </aside>

        <div className="editor-main">
          <div className="editor-toolbar" role="toolbar" aria-label="Formatting">
            <button
              type="button"
              disabled={!editor}
              onClick={() => editor?.chain().focus().toggleBold().run()}
            >
              Bold
            </button>
            <button
              type="button"
              disabled={!editor}
              onClick={() => editor?.chain().focus().toggleItalic().run()}
            >
              Italic
            </button>
            <button
              type="button"
              disabled={!editor}
              onClick={() => editor?.chain().focus().toggleHeading({ level: 2 }).run()}
            >
              H2
            </button>
            <button
              type="button"
              disabled={!editor}
              onClick={() => editor?.chain().focus().toggleBulletList().run()}
            >
              List
            </button>
            <button
              type="button"
              disabled={!editor}
              onClick={() => editor?.chain().focus().toggleBlockquote().run()}
            >
              Quote
            </button>
          </div>
          <EditorContent editor={editor} />
        </div>
      </div>

      <p className={`status status-${status}`} data-testid="editor-projection-status">
        {status}
      </p>
      <p className="detail">{detail}</p>
      <p className="detail" data-testid="editor-roundtrip">
        {roundTrip}
      </p>
    </section>
  );
}
