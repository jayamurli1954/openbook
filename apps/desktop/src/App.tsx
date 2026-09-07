/**
 * SPDX-License-Identifier: Apache-2.0
 *
 * Minimal OpenBook desktop shell UI.
 * Hard stops: no editor, engines, AI, publishing workflow, or production DB schema.
 */
import { useEffect, useState } from "react";
import { BOOK_MODEL_SCHEMA_VERSION } from "@openbook/book-model";
import { proveSqliteConnectivity } from "./sqliteConnectivity";
import "./App.css";

type Status = "idle" | "running" | "ok" | "error";

export default function App() {
  const [sqliteStatus, setSqliteStatus] = useState<Status>("idle");
  const [sqliteDetail, setSqliteDetail] = useState("Not run yet");

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

  return (
    <main className="shell">
      <h1>OpenBook Studio</h1>
      <p className="lede">
        Desktop foundation shell (ADR-0007). Book Model is canonical; SQLite is
        infrastructure only.
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
