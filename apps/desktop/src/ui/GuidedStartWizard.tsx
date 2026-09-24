/**
 * SPDX-License-Identifier: Apache-2.0
 *
 * ADR-0033 Slice 3 — thin React guided-start wizard shell.
 * Delegates execution to GuidedStartHostAdapter. No Tauri, filesystem,
 * or coordinator methods live here.
 */
import { useEffect, useState } from "react";
import type { ImportSource } from "@openbook/importer";
import type {
  GuidedStartPath,
  GuidedStartRecentEntry,
  NewBookFields,
} from "../workflow/domain/guidedStartContract.js";
import type { IGuidedStartHostAdapter } from "../workflow/domain/guidedStartHostAdapter.js";
import {
  getGuidedStartFieldHelp,
  type GuidedStartFieldHelpKey,
} from "../workflow/domain/guidedStartTerminology.js";

const PATH_LABELS: Record<GuidedStartPath, string> = {
  "new-book": "New Book",
  import: "Import Existing Book",
  "open-recent": "Open Recent Book",
  continue: "Continue Existing Project",
};

export interface GuidedStartWizardProps {
  readonly host: IGuidedStartHostAdapter;
  /** Called after a successful start path so the editor can refresh. */
  readonly onStarted?: () => void;
}

function FieldHelp({ field }: { readonly field: GuidedStartFieldHelpKey }) {
  return (
    <p className="note guided-start-help" data-testid={`help-${field}`}>
      {getGuidedStartFieldHelp(field)}
    </p>
  );
}

export default function GuidedStartWizard({
  host,
  onStarted,
}: GuidedStartWizardProps) {
  const [path, setPath] = useState<GuidedStartPath | null>(null);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState("Choose how you want to start.");
  const [recent, setRecent] = useState<readonly GuidedStartRecentEntry[]>([]);

  const [title, setTitle] = useState("");
  const [subtitle, setSubtitle] = useState("");
  const [authors, setAuthors] = useState("");
  const [language, setLanguage] = useState("en");
  const [bookType, setBookType] = useState("");
  const [intendedAudience, setIntendedAudience] = useState("");
  const [approximateLength, setApproximateLength] = useState("");
  const [writingGoal, setWritingGoal] = useState("");

  const [importFormat, setImportFormat] = useState<ImportSource["format"]>("markdown");
  const [importFilename, setImportFilename] = useState("manuscript.md");
  const [importText, setImportText] = useState("");
  const [openRoot, setOpenRoot] = useState("");

  useEffect(() => {
    if (path !== "open-recent") return;
    let cancelled = false;
    void host.listRecent().then((entries) => {
      if (!cancelled) setRecent(entries);
    });
    return () => {
      cancelled = true;
    };
  }, [host, path]);

  const finishOk = (message: string) => {
    setStatus(message);
    setPath(null);
    onStarted?.();
  };

  const startNewBook = async () => {
    setBusy(true);
    try {
      const authorList = authors
        .split(",")
        .map((part) => part.trim())
        .filter((part) => part.length > 0);
      const fields: Partial<NewBookFields> = {
        title,
        language,
        authors: authorList,
        ...(subtitle.trim() ? { subtitle: subtitle.trim() } : {}),
        ...(bookType.trim() ? { bookType: bookType.trim() } : {}),
        ...(intendedAudience.trim()
          ? { intendedAudience: intendedAudience.trim() }
          : {}),
        ...(approximateLength.trim()
          ? { approximateLength: approximateLength.trim() }
          : {}),
        ...(writingGoal.trim() ? { writingGoal: writingGoal.trim() } : {}),
      };
      const result = await host.startNewBook(fields);
      if (!result.ok) {
        setStatus(`${result.code}: ${result.message}`);
        return;
      }
      finishOk(`Started “${result.projectName}” (${result.language}).`);
    } finally {
      setBusy(false);
    }
  };

  const runImport = async () => {
    setBusy(true);
    try {
      const content = importText.trim();
      if (!content) {
        setStatus("Paste manuscript text before importing.");
        return;
      }
      const result = await host.importBook({
        source: {
          format: importFormat,
          content,
          filename: importFilename.trim() || undefined,
        },
        options: { mode: "new-project" },
      });
      if (!result.ok) {
        setStatus(`${result.code}: ${result.message}`);
        return;
      }
      finishOk(
        `Imported ${result.result.sectionCount} section(s), ${result.result.wordCount} word(s).`,
      );
    } finally {
      setBusy(false);
    }
  };

  const openRecentRoot = async (projectRoot: string) => {
    setBusy(true);
    try {
      const result = await host.openRecent({ projectRoot });
      if (!result.ok) {
        setStatus(`${result.code}: ${result.message}`);
        return;
      }
      finishOk(`Opened package at ${result.result.projectRoot}.`);
    } finally {
      setBusy(false);
    }
  };

  const continueExisting = async () => {
    setBusy(true);
    try {
      const result = await host.continueExisting();
      if (!result.ok) {
        setStatus(`${result.code}: ${result.message}`);
        return;
      }
      finishOk(`Continued package at ${result.result.projectRoot}.`);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="project-bar guided-start-wizard" aria-label="Guided start">
      <span className="project-binding">Guided Start (Phase 1)</span>
      <p className="note">
        Choose New Book, Import, Open Recent, or Continue. Execution goes through
        the guided-start host adapter — not a parallel project model.
      </p>

      {path === null ? (
        <div className="project-actions" role="group" aria-label="Start paths">
          {(Object.keys(PATH_LABELS) as GuidedStartPath[]).map((key) => (
            <button
              key={key}
              type="button"
              data-testid={`guided-start-path-${key}`}
              disabled={busy}
              onClick={() => {
                setPath(key);
                setStatus(`Path: ${PATH_LABELS[key]}`);
              }}
            >
              {PATH_LABELS[key]}
            </button>
          ))}
        </div>
      ) : (
        <div className="project-actions">
          <button
            type="button"
            data-testid="guided-start-back"
            disabled={busy}
            onClick={() => {
              setPath(null);
              setStatus("Choose how you want to start.");
            }}
          >
            Back
          </button>
        </div>
      )}

      {path === "new-book" ? (
        <form
          className="guided-start-form"
          data-testid="guided-start-new-book"
          onSubmit={(event) => {
            event.preventDefault();
            void startNewBook();
          }}
        >
          <label>
            Title
            <input
              data-testid="guided-start-title"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              required
            />
          </label>
          <FieldHelp field="title" />

          <label>
            Subtitle
            <input
              data-testid="guided-start-subtitle"
              value={subtitle}
              onChange={(event) => setSubtitle(event.target.value)}
            />
          </label>
          <FieldHelp field="subtitle" />

          <label>
            Authors (comma-separated)
            <input
              data-testid="guided-start-authors"
              value={authors}
              onChange={(event) => setAuthors(event.target.value)}
            />
          </label>
          <FieldHelp field="authors" />

          <label>
            Language
            <input
              data-testid="guided-start-language"
              value={language}
              onChange={(event) => setLanguage(event.target.value)}
              required
            />
          </label>
          <FieldHelp field="language" />

          <label>
            Book type
            <input
              data-testid="guided-start-book-type"
              value={bookType}
              onChange={(event) => setBookType(event.target.value)}
            />
          </label>
          <FieldHelp field="bookType" />

          <label>
            Intended audience
            <input
              data-testid="guided-start-audience"
              value={intendedAudience}
              onChange={(event) => setIntendedAudience(event.target.value)}
            />
          </label>
          <FieldHelp field="intendedAudience" />

          <label>
            Approximate length
            <input
              data-testid="guided-start-length"
              value={approximateLength}
              onChange={(event) => setApproximateLength(event.target.value)}
            />
          </label>
          <FieldHelp field="approximateLength" />

          <label>
            Writing goal
            <input
              data-testid="guided-start-goal"
              value={writingGoal}
              onChange={(event) => setWritingGoal(event.target.value)}
            />
          </label>
          <FieldHelp field="writingGoal" />

          <div className="project-actions">
            <button
              type="submit"
              data-testid="guided-start-create"
              disabled={busy}
            >
              Create book
            </button>
          </div>
        </form>
      ) : null}

      {path === "import" ? (
        <div className="guided-start-form" data-testid="guided-start-import">
          <label className="import-file">
            Filename
            <input
              data-testid="guided-start-import-filename"
              value={importFilename}
              onChange={(event) => setImportFilename(event.target.value)}
            />
          </label>
          <label className="import-file">
            Format
            <select
              data-testid="guided-start-import-format"
              value={importFormat}
              onChange={(event) =>
                setImportFormat(
                  event.target.value === "text" ? "text" : "markdown",
                )
              }
            >
              <option value="markdown">Markdown</option>
              <option value="text">Plain text</option>
            </select>
          </label>
          <textarea
            className="import-source"
            data-testid="guided-start-import-source"
            rows={6}
            spellCheck={false}
            value={importText}
            placeholder="# Chapter title&#10;&#10;Paste manuscript text…"
            onChange={(event) => setImportText(event.target.value)}
          />
          <div className="project-actions">
            <button
              type="button"
              data-testid="guided-start-import-run"
              disabled={busy}
              onClick={() => void runImport()}
            >
              Import as new project
            </button>
          </div>
        </div>
      ) : null}

      {path === "open-recent" ? (
        <div className="guided-start-form" data-testid="guided-start-open-recent">
          {recent.length === 0 ? (
            <p className="note" data-testid="guided-start-recent-empty">
              No durable recent list yet (Slice 4). Enter a package root to open.
            </p>
          ) : (
            <ul className="guided-start-recent-list" data-testid="guided-start-recent-list">
              {recent.map((entry) => (
                <li key={entry.projectRoot}>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => void openRecentRoot(entry.projectRoot)}
                  >
                    {entry.displayName}
                  </button>
                </li>
              ))}
            </ul>
          )}
          <label>
            Package root
            <input
              data-testid="guided-start-open-root"
              value={openRoot}
              onChange={(event) => setOpenRoot(event.target.value)}
            />
          </label>
          <div className="project-actions">
            <button
              type="button"
              data-testid="guided-start-open-run"
              disabled={busy}
              onClick={() => void openRecentRoot(openRoot)}
            >
              Open package
            </button>
          </div>
        </div>
      ) : null}

      {path === "continue" ? (
        <div className="guided-start-form" data-testid="guided-start-continue">
          <p className="note">
            Continues the last bound package / recovery handoff through the host
            adapter. Durable continue wiring arrives in Slice 4.
          </p>
          <div className="project-actions">
            <button
              type="button"
              data-testid="guided-start-continue-run"
              disabled={busy}
              onClick={() => void continueExisting()}
            >
              Continue
            </button>
          </div>
        </div>
      ) : null}

      <p className="detail" data-testid="guided-start-status">
        {status}
      </p>
    </div>
  );
}
