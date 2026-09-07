/**
 * SPDX-License-Identifier: Apache-2.0
 *
 * Minimal OpenBook desktop shell UI.
 * Hard stops: no engines, AI, publishing workflow, or production DB schema.
 * Editor transport is Tiptap JSON only; Book Model remains canonical via SDM.
 */
import { useEffect, useState } from "react";
import { BOOK_MODEL_SCHEMA_VERSION } from "@openbook/book-model";
import { SEMANTIC_DOCUMENT_SCHEMA_VERSION } from "@openbook/semantic-document";
import { createSemanticDocument, projectSemanticDocumentToBook } from "./domain/semanticDocumentBoundary";
import EditorSurface from "./EditorSurface";
import { proveSqliteConnectivity } from "./sqliteConnectivity";
import "./App.css";

type Status = "idle" | "running" | "ok" | "error";

export default function App() {
  const [sqliteStatus, setSqliteStatus] = useState<Status>("idle");
  const [sqliteDetail, setSqliteDetail] = useState("Not run yet");
  const [sdmStatus, setSdmStatus] = useState<Status>("idle");
  const [sdmDetail, setSdmDetail] = useState("Not run yet");

  useEffect(() => {
    let cancelled = false;
    setSqliteStatus("running");
    void proveSqliteConnectivity().then((result) => {
      if (cancelled) return;
      if (result.ok) {
        setSqliteStatus("ok");
        setSqliteDetail(`SELECT 1 → ${result.one} (connectivity only; no schema)`);
      } else {
        setSqliteStatus("error");
        setSqliteDetail(result.error);
      }
    });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    setSdmStatus("running");
    try {
      const doc = createSemanticDocument({
        title: "Desktop shell SDM smoke",
        language: "en",
        authors: ["OpenBook"],
      });
      const result = projectSemanticDocumentToBook(doc);
      if (!result.ok) {
        setSdmStatus("error");
        setSdmDetail(`${result.stage}: ${result.error}`);
        return;
      }
      setSdmStatus("ok");
      setSdmDetail(
        `Desktop → SDM v${doc.schemaVersion} → Book v${result.book.schemaVersion} (${result.book.metadata.title})`,
      );
    } catch (err) {
      setSdmStatus("error");
      setSdmDetail(err instanceof Error ? err.message : String(err));
    }
  }, []);

  return (
    <main className="shell">
      <h1>OpenBook Studio</h1>
      <p className="lede">
        Desktop foundation shell. Book Model is canonical; Semantic Document is
        the editor contract; SQLite is infrastructure only.
      </p>

      <section>
        <h2>Book Model</h2>
        <dl>
          <div>
            <dt>Package</dt>
            <dd>@openbook/book-model</dd>
          </div>
          <div>
            <dt>schemaVersion</dt>
            <dd>{BOOK_MODEL_SCHEMA_VERSION}</dd>
          </div>
          <div>
            <dt>Role</dt>
            <dd>Canonical format-neutral domain model (not SQLite)</dd>
          </div>
        </dl>
      </section>

      <section>
        <h2>Semantic Document boundary</h2>
        <dl>
          <div>
            <dt>Package</dt>
            <dd>@openbook/semantic-document</dd>
          </div>
          <div>
            <dt>schemaVersion</dt>
            <dd>{SEMANTIC_DOCUMENT_SCHEMA_VERSION}</dd>
          </div>
          <div>
            <dt>Path</dt>
            <dd>Desktop → SDM → Book (in-memory)</dd>
          </div>
        </dl>
        <p className={`status status-${sdmStatus}`} data-testid="sdm-status">
          {sdmStatus}
        </p>
        <p className="detail">{sdmDetail}</p>
        <p className="note">
          No persistence or publishing engines in this slice.
        </p>
      </section>

      <EditorSurface />

      <section>
        <h2>SQLite connectivity</h2>
        <p className={`status status-${sqliteStatus}`} data-testid="sqlite-status">
          {sqliteStatus}
        </p>
        <p className="detail">{sqliteDetail}</p>
        <p className="note">
          No production persistence schema, migrations, or domain database model
          in this slice.
        </p>
      </section>
    </main>
  );
}
