/**
 * SPDX-License-Identifier: Apache-2.0
 *
 * Minimal Tiptap authoring surface for the desktop shell.
 * Editor transport stays in Tiptap JSON; canonical content goes through
 * EditorAdapter → SemanticDocument → desktop domain boundary → Book.
 */
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Link from "@tiptap/extension-link";
import { useEffect, useState } from "react";
import { bookToSemanticDocument } from "@openbook/semantic-document";
import {
  normalizeTipTapDoc,
  semanticDocumentToTipTapJson,
  tipTapJsonToSemanticDocument,
  type TipTapDocJSON,
} from "./domain/editorAdapter";
import { projectSemanticDocumentToBook } from "./domain/semanticDocumentBoundary";
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

export default function EditorSurface() {
  const [status, setStatus] = useState<ProjectionStatus>("idle");
  const [detail, setDetail] = useState("Edit to project through SDM → Book");
  const [roundTrip, setRoundTrip] = useState("Not checked");

  const editor = useEditor({
    extensions: [
      StarterKit,
      Link.configure({
        openOnClick: false,
        autolink: true,
        defaultProtocol: "https",
      }),
    ],
    content: englishFixture as TipTapDocJSON,
    editorProps: {
      attributes: {
        class: "tiptap-surface",
        "data-testid": "tiptap-editor",
        lang: "en",
      },
    },
  });

  useEffect(() => {
    if (!editor) return;

    const project = () => {
      const json = editor.getJSON() as TipTapDocJSON;
      const { document, warnings } = tipTapJsonToSemanticDocument(json, {
        metadata: emptyMetadata("en", "Desktop editor draft"),
        sectionTitle: "Chapter 1",
      });
      const result = projectSemanticDocumentToBook(document);
      if (!result.ok) {
        setStatus("error");
        setDetail(`${result.stage}: ${result.error}`);
        setRoundTrip("n/a");
        return;
      }

      const back = bookToSemanticDocument(result.book);
      const { doc: tipTapFromBook } = semanticDocumentToTipTapJson(back);
      const { doc: tipTapFromSdm } = semanticDocumentToTipTapJson(document);
      const matched =
        JSON.stringify(normalizeTipTapDoc(tipTapFromBook)) ===
        JSON.stringify(normalizeTipTapDoc(tipTapFromSdm));

      setStatus("ok");
      setDetail(
        `Tiptap → SDM → Book v${result.book.schemaVersion} (${result.book.metadata.title}); warnings=${warnings.length}`,
      );
      setRoundTrip(
        matched
          ? "Tiptap → SDM → Book → SDM → Tiptap content match"
          : "round-trip mismatch",
      );
    };

    project();
    editor.on("update", project);
    return () => {
      editor.off("update", project);
    };
  }, [editor]);

  return (
    <section className="editor-section">
      <h2>Editor (Tiptap)</h2>
      <p className="note">
        Transport only. Path: Tiptap → EditorAdapter → SDM → Book (canonical).
      </p>
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
