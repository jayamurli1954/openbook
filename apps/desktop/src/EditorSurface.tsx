/**
 * SPDX-License-Identifier: Apache-2.0
 *
 * Tiptap authoring surface with in-memory multi-chapter operations and
 * Save/Open through ProjectPersistence (canonical Book only; never Tiptap JSON).
 */
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Link from "@tiptap/extension-link";
import { useEffect, useRef, useState } from "react";
import { bookToSemanticDocument } from "@openbook/semantic-document";
import {
  normalizeTipTapDoc,
  semanticDocumentToTipTapJson,
  type TipTapDocJSON,
} from "./domain/editorAdapter";
import {
  applyTipTapToSelectedChapter,
  createChapter,
  createEditorBookSession,
  deleteChapter,
  listSessionChapters,
  projectSessionToBook,
  renameChapter,
  selectChapter,
  selectedChapterToTipTap,
  type EditorBookSession,
} from "./domain/editorBookSession";
import { SqliteProjectPersistence } from "./persistence/sqlitePersistence";
import type { ProjectPersistence, ProjectSummary } from "./persistence/types";
import {
  listEditorProjects,
  openEditorProject,
  saveEditorSession,
  type ActiveProjectBinding,
} from "./workflow/projectWorkflow";
import englishFixture from "./fixtures/english-tiptap.json";

type ProjectionStatus = "idle" | "ok" | "error";

function emptyMetadata(language: string, title: string) {
  return {
    title,
    subtitle: "",
    authors: ["OpenBook"],
    contributors: [] as string[],
    language,
    identifier: "",
    publisher: "",
    publishedAt: "",
    copyright: "",
    description: "",
    subjects: [] as string[],
    rights: "",
  };
}

function initialSession(): EditorBookSession {
  const result = createEditorBookSession({
    metadata: emptyMetadata("en", "Desktop editor draft"),
    chapters: [
      {
        id: "sec-chapter-1",
        title: "Chapter 1",
        tipTap: englishFixture as TipTapDocJSON,
      },
      { id: "sec-chapter-2", title: "Chapter 2" },
    ],
  });
  if (!result.ok) {
    throw new Error(result.error);
  }
  return result.session;
}

export default function EditorSurface() {
  const [session, setSession] = useState<EditorBookSession>(() => initialSession());
  const sessionRef = useRef(session);
  sessionRef.current = session;

  const [status, setStatus] = useState<ProjectionStatus>("idle");
  const [detail, setDetail] = useState("Edit to project through SDM → Book");
  const [roundTrip, setRoundTrip] = useState("Not checked");
  const [sessionNote, setSessionNote] = useState("In-memory multi-chapter session");
  const [binding, setBinding] = useState<ActiveProjectBinding | null>(null);
  const bindingRef = useRef(binding);
  bindingRef.current = binding;
  const [persistStatus, setPersistStatus] = useState("Persistence: not initialized");
  const [projectList, setProjectList] = useState<ProjectSummary[]>([]);
  const switchingRef = useRef(false);
  const persistenceRef = useRef<ProjectPersistence | null>(null);

  const chapters = listSessionChapters(session);
  const selected = chapters.find((c) => c.id === session.selectedChapterId);

  const editor = useEditor({
    extensions: [
      StarterKit,
      Link.configure({
        openOnClick: false,
        autolink: true,
        defaultProtocol: "https",
      }),
    ],
    content: selectedChapterToTipTap(session).doc,
    editorProps: {
      attributes: {
        class: "tiptap-surface",
        "data-testid": "tiptap-editor",
        lang: "en",
      },
    },
  });

  useEffect(() => {
    const persistence = new SqliteProjectPersistence();
    persistenceRef.current = persistence;
    void persistence.initialize().then((result) => {
      if (!result.ok) {
        setPersistStatus(`Persistence: ${result.error.message}`);
        return;
      }
      setPersistStatus("Persistence: ready (SQLite ProjectPersistence)");
      void listEditorProjects(persistence).then((listed) => {
        if (listed.ok) setProjectList(listed.value);
      });
    });
    return () => {
      void persistence.close();
      persistenceRef.current = null;
    };
  }, []);

  const projectFromSession = (next: EditorBookSession, warningsCount: number) => {
    const result = projectSessionToBook(next);
    if (!result.ok) {
      setStatus("error");
      setDetail(`${result.stage}: ${result.error}`);
      setRoundTrip("n/a");
      return;
    }

    const back = bookToSemanticDocument(result.book);
    const selectedId = next.selectedChapterId;
    const sdmChapter = next.document.sections.find((s) => s.id === selectedId);
    const bookChapter = back.sections.find((s) => s.id === selectedId);
    let matched = false;
    if (sdmChapter && bookChapter) {
      const tipFromSdm = semanticDocumentToTipTapJson({
        ...next.document,
        sections: [sdmChapter],
      }).doc;
      const tipFromBook = semanticDocumentToTipTapJson({
        ...back,
        sections: [bookChapter],
      }).doc;
      matched =
        JSON.stringify(normalizeTipTapDoc(tipFromSdm)) ===
        JSON.stringify(normalizeTipTapDoc(tipFromBook));
    }

    setStatus("ok");
    setDetail(
      `Tiptap → SDM (${listSessionChapters(next).length} ch) → Book v${result.book.schemaVersion}; warnings=${warningsCount}`,
    );
    setRoundTrip(
      matched
        ? "Selected chapter: SDM → Book → SDM → Tiptap match"
        : "round-trip mismatch",
    );
  };

  useEffect(() => {
    if (!editor) return;

    const onUpdate = () => {
      if (switchingRef.current) return;
      const json = editor.getJSON() as TipTapDocJSON;
      const applied = applyTipTapToSelectedChapter(sessionRef.current, json);
      if (!applied.ok) {
        setStatus("error");
        setDetail(applied.error);
        return;
      }
      sessionRef.current = applied.session;
      setSession(applied.session);
      projectFromSession(applied.session, applied.warnings.length);
    };

    onUpdate();
    editor.on("update", onUpdate);
    return () => {
      editor.off("update", onUpdate);
    };
  }, [editor]);

  const flushEditorIntoSession = (): EditorBookSession | null => {
    if (!editor) return sessionRef.current;
    const applied = applyTipTapToSelectedChapter(
      sessionRef.current,
      editor.getJSON() as TipTapDocJSON,
    );
    if (!applied.ok) {
      setSessionNote(applied.error);
      return null;
    }
    sessionRef.current = applied.session;
    setSession(applied.session);
    return applied.session;
  };

  const loadChapterIntoEditor = (next: EditorBookSession) => {
    if (!editor) return;
    switchingRef.current = true;
    const { doc } = selectedChapterToTipTap(next);
    editor.commands.setContent(doc, { emitUpdate: false });
    switchingRef.current = false;
    projectFromSession(next, 0);
  };

  const refreshProjectList = async (persistence: ProjectPersistence) => {
    const listed = await listEditorProjects(persistence);
    if (listed.ok) setProjectList(listed.value);
  };

  const onSelectChapter = (chapterId: string) => {
    const flushed = flushEditorIntoSession();
    if (!flushed) return;
    const selectedNext = selectChapter(flushed, chapterId);
    if (!selectedNext.ok) {
      setSessionNote(selectedNext.error);
      return;
    }
    sessionRef.current = selectedNext.session;
    setSession(selectedNext.session);
    setSessionNote(
      `Selected “${listSessionChapters(selectedNext.session).find((c) => c.id === chapterId)?.title ?? chapterId}”`,
    );
    loadChapterIntoEditor(selectedNext.session);
  };

  const onCreateChapter = () => {
    const flushed = flushEditorIntoSession();
    if (!flushed) return;
    const n = listSessionChapters(flushed).length + 1;
    const created = createChapter(flushed, `Chapter ${n}`);
    if (!created.ok) {
      setSessionNote(created.error);
      return;
    }
    sessionRef.current = created.session;
    setSession(created.session);
    setSessionNote(`Created “Chapter ${n}”`);
    loadChapterIntoEditor(created.session);
  };

  const onRenameChapter = () => {
    const current = listSessionChapters(sessionRef.current).find(
      (c) => c.id === sessionRef.current.selectedChapterId,
    );
    if (!current) return;
    const nextTitle = window.prompt("Rename chapter", current.title);
    if (nextTitle === null) return;
    const flushed = flushEditorIntoSession();
    if (!flushed) return;
    const renamed = renameChapter(flushed, current.id, nextTitle);
    if (!renamed.ok) {
      setSessionNote(renamed.error);
      return;
    }
    sessionRef.current = renamed.session;
    setSession(renamed.session);
    setSessionNote(`Renamed to “${nextTitle.trim() || "Untitled chapter"}”`);
    projectFromSession(renamed.session, 0);
  };

  const onDeleteChapter = () => {
    const flushed = flushEditorIntoSession();
    if (!flushed) return;
    const id = flushed.selectedChapterId;
    const deleted = deleteChapter(flushed, id);
    if (!deleted.ok) {
      setSessionNote(deleted.error);
      return;
    }
    sessionRef.current = deleted.session;
    setSession(deleted.session);
    setSessionNote("Chapter deleted");
    loadChapterIntoEditor(deleted.session);
  };

  const onNewBook = () => {
    const next = initialSession();
    sessionRef.current = next;
    setSession(next);
    setBinding(null);
    bindingRef.current = null;
    setSessionNote("Started a new unsaved book session");
    setPersistStatus("Persistence: ready (unsaved new book)");
    loadChapterIntoEditor(next);
  };

  const onSaveProject = async () => {
    const persistence = persistenceRef.current;
    if (!persistence) {
      setPersistStatus("Persistence: not available");
      return;
    }
    const flushed = flushEditorIntoSession();
    if (!flushed) return;

    let projectName: string | undefined;
    if (!bindingRef.current) {
      const suggested = flushed.document.metadata.title || "Untitled Project";
      const entered = window.prompt("Save project as", suggested);
      if (entered === null) return;
      projectName = entered;
    }

    const result = await saveEditorSession({
      persistence,
      session: flushed,
      binding: bindingRef.current,
      projectName,
    });
    if (!result.ok) {
      setPersistStatus(result.message.text);
      return;
    }
    setBinding(result.value.binding);
    bindingRef.current = result.value.binding;
    setPersistStatus(result.message.text);
    await refreshProjectList(persistence);
  };

  const onOpenProject = async () => {
    const persistence = persistenceRef.current;
    if (!persistence) {
      setPersistStatus("Persistence: not available");
      return;
    }
    await refreshProjectList(persistence);
    const listed = await listEditorProjects(persistence);
    if (!listed.ok) {
      setPersistStatus(listed.message.text);
      return;
    }
    if (listed.value.length === 0) {
      setPersistStatus("No project selected. No saved projects available.");
      return;
    }

    const choices = listed.value
      .map((p, i) => `${i + 1}. ${p.name} (${p.id})`)
      .join("\n");
    const entered = window.prompt(
      `Open project — enter number or project id:\n${choices}`,
      "1",
    );
    if (entered === null) return;
    const trimmed = entered.trim();
    const asIndex = Number.parseInt(trimmed, 10);
    const projectId =
      Number.isFinite(asIndex) && asIndex >= 1 && asIndex <= listed.value.length
        ? listed.value[asIndex - 1]!.id
        : trimmed;

    if (!projectId) {
      setPersistStatus("No project selected to open.");
      return;
    }

    const opened = await openEditorProject({
      persistence,
      projectId,
      preferredChapterId: sessionRef.current.selectedChapterId,
    });
    if (!opened.ok) {
      setPersistStatus(opened.message.text);
      return;
    }

    sessionRef.current = opened.value.session;
    setSession(opened.value.session);
    setBinding(opened.value.binding);
    bindingRef.current = opened.value.binding;
    setPersistStatus(opened.message.text);
    setSessionNote(`Opened “${opened.value.binding.projectName}”`);
    loadChapterIntoEditor(opened.value.session);
  };

  return (
    <section className="editor-section">
      <h2>Editor (Tiptap)</h2>
      <p className="note">
        Path: Tiptap → EditorAdapter → SDM → Book (canonical) → ProjectPersistence →
        SQLite. Tiptap JSON is never saved.
      </p>

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
                    chapter.id === session.selectedChapterId
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
