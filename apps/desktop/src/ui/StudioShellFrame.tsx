/**
 * SPDX-License-Identifier: Apache-2.0
 *
 * ADR-0039 Slice 2 — studio shell frame.
 * Top bar, step bar, and layout regions (outline, main, guide). Content is
 * passed in; this component holds no book state and calls no services.
 */
import type { ReactNode } from "react";
import type {
  StudioStepId,
  StudioStepStatus,
} from "../workflow/domain/studioShellContract.js";
import type { StudioSaveStatus } from "../workflow/domain/studioShellStatus.js";

export interface StudioShellFrameProps {
  readonly title: string;
  readonly saveStatus: StudioSaveStatus;
  readonly steps: readonly StudioStepStatus[];
  readonly progress: { readonly done: number; readonly total: number };
  readonly activeStep: StudioStepId;
  readonly onSelectStep: (id: StudioStepId) => void;
  /** Opens the Publish step. */
  readonly onExport?: () => void;
  readonly diagnosticsOpen: boolean;
  readonly onToggleDiagnostics: () => void;
  readonly diagnostics: ReactNode;
  /** Left region; omitted until the outline moves here. */
  readonly outline?: ReactNode;
  /** Right region; omitted until the Guide panel exists. */
  readonly guide?: ReactNode;
  readonly children: ReactNode;
}

function stepMark(step: StudioStepStatus, index: number): string {
  if (step.state === "done") return "✓";
  if (step.state === "attention") return "!";
  return String(index + 1);
}

export default function StudioShellFrame({
  title,
  saveStatus,
  steps,
  progress,
  activeStep,
  onSelectStep,
  onExport,
  diagnosticsOpen,
  onToggleDiagnostics,
  diagnostics,
  outline,
  guide,
  children,
}: StudioShellFrameProps) {
  const percent = progress.total > 0 ? Math.round((progress.done / progress.total) * 100) : 0;
  return (
    <div className="studio-shell" data-testid="studio-shell">
      <header className="studio-topbar">
        <div className="studio-topbar-book">
          <span className="studio-brand">OpenBook</span>
          <span className="studio-topbar-sep" aria-hidden="true">
            /
          </span>
          <span className="studio-book-title" data-testid="studio-book-title">
            {title}
          </span>
          <span
            className={`studio-save studio-save-${saveStatus.tone}`}
            role="status"
            data-testid="studio-save-status"
          >
            {saveStatus.text}
          </span>
        </div>
        <div className="studio-topbar-actions">
          {onExport ? (
            <button
              type="button"
              className="studio-btn studio-btn-primary"
              onClick={onExport}
              data-testid="studio-export"
            >
              Export…
            </button>
          ) : null}
          <button
            type="button"
            className="studio-btn"
            aria-expanded={diagnosticsOpen}
            aria-controls="studio-diagnostics"
            onClick={onToggleDiagnostics}
            data-testid="studio-diagnostics-toggle"
          >
            {diagnosticsOpen ? "Hide diagnostics" : "Diagnostics"}
          </button>
        </div>
      </header>

      <nav className="studio-stepbar" aria-label="Book steps">
        <ol className="studio-steps">
          {steps.map((step, index) => {
            const current = step.id === activeStep;
            return (
              <li key={step.id}>
                <button
                  type="button"
                  className={`studio-step studio-step-${step.state}${current ? " is-current" : ""}`}
                  aria-current={current ? "step" : undefined}
                  onClick={() => onSelectStep(step.id)}
                  data-testid={`studio-step-${step.id}`}
                >
                  <span className="studio-step-mark" aria-hidden="true">
                    {stepMark(step, index)}
                  </span>
                  <span className="studio-step-text">
                    <span className="studio-step-label">{step.label}</span>
                    <span className="studio-step-status">{step.text}</span>
                  </span>
                </button>
              </li>
            );
          })}
        </ol>
        <div className="studio-progress" data-testid="studio-progress">
          <span className="studio-progress-label">Book progress</span>
          <span className="studio-progress-track" aria-hidden="true">
            <span className="studio-progress-fill" style={{ width: `${percent}%` }} />
          </span>
          <span className="studio-progress-count">
            {progress.done} of {progress.total}
          </span>
        </div>
      </nav>

      <div className="studio-body">
        {outline ? (
          <aside className="studio-outline" aria-label="Book outline">
            {outline}
          </aside>
        ) : null}
        <main className="studio-main">{children}</main>
        {guide ? (
          <aside className="studio-guide" aria-label="Guide">
            {guide}
          </aside>
        ) : null}
      </div>

      <section
        id="studio-diagnostics"
        className="studio-diagnostics"
        aria-label="Diagnostics"
        hidden={!diagnosticsOpen}
        data-testid="studio-diagnostics"
      >
        {diagnostics}
      </section>
    </div>
  );
}
