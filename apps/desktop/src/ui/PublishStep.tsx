/**
 * SPDX-License-Identifier: Apache-2.0
 *
 * ADR-0039 Slice 4 — Publish step: check the book, then export.
 * The check runs through the coordinator via onCheck; export goes through
 * ExportPanel and DesktopExportController.
 */
import { useState } from "react";
import type { BookCheckSummary } from "../workflow/domain/studioShellPublish.js";
import type { DesktopExportController } from "../host/desktopExportController.js";
import ExportPanel from "./ExportPanel";

export interface PublishStepProps {
  readonly summary: BookCheckSummary;
  readonly exportController: DesktopExportController;
  readonly onCheck: () => Promise<void>;
  readonly onOpenSection: (sectionId: string) => void;
}

export default function PublishStep({
  summary,
  exportController,
  onCheck,
  onOpenSection,
}: PublishStepProps) {
  const [checking, setChecking] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);
  const ready = summary.state === "ready" || summary.state === "warnings";

  const check = async () => {
    setChecking(true);
    setProblem(null);
    try {
      await onCheck();
    } catch {
      setProblem("The check could not finish. Try again in a moment.");
    } finally {
      setChecking(false);
    }
  };

  return (
    <section className="studio-step-panel publish-step" aria-label="Publish" data-testid="studio-publish-step">
      <header className="studio-step-header">
        <h2>Publish</h2>
        <p className="studio-step-lede">
          Check your book, then export the files you need. Every export uses the latest check.
        </p>
      </header>

      <section className={`book-check book-check-${summary.state}`} aria-label="Book check">
        <div className="book-check-head">
          <p className="book-check-headline" role="status" data-testid="book-check-headline">
            {summary.headline}
          </p>
          <button
            type="button"
            className={summary.state === "unchecked" ? "studio-btn studio-btn-primary" : "studio-btn"}
            onClick={() => void check()}
            disabled={checking}
            data-testid="book-check-run"
          >
            {checking ? "Checking…" : summary.state === "unchecked" ? "Check my book" : "Check again"}
          </button>
        </div>
        {problem ? (
          <p className="book-check-problem" role="alert">
            {problem}
          </p>
        ) : null}
        {summary.items.length > 0 ? (
          <ul className="book-check-items">
            {summary.items.map((item, index) => (
              <li key={index} className={`book-check-item book-check-${item.tone}`}>
                <span className="book-check-mark" aria-hidden="true">
                  {item.tone === "fix" ? "!" : "i"}
                </span>
                <span className="book-check-text">
                  <span className="visually-hidden">{item.tone === "fix" ? "Must fix: " : "Suggestion: "}</span>
                  {item.text}
                  {item.suggestion ? <span className="book-check-suggestion"> {item.suggestion}</span> : null}
                </span>
                {item.sectionId ? (
                  <button
                    type="button"
                    className="studio-link"
                    onClick={() => onOpenSection(item.sectionId!)}
                  >
                    Go there
                  </button>
                ) : null}
              </li>
            ))}
          </ul>
        ) : null}
      </section>

      <ExportPanel controller={exportController} ready={ready} />
    </section>
  );
}
