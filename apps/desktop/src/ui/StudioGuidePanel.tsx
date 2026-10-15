/**
 * SPDX-License-Identifier: Apache-2.0
 *
 * ADR-0039 Slice 5 — Guide panel.
 * Help for the current step: what to do here (a checklist that ticks
 * itself off from the Book), tips, "Stuck?" questions, and the next step.
 * Content comes from the Slice 1 guide module; this component only renders.
 */
import type {
  StudioGuide,
  StudioGuideChecklistResult,
} from "../workflow/domain/studioShellGuide.js";

export interface StudioGuidePanelProps {
  readonly stepLabel: string;
  readonly guide: StudioGuide;
  readonly checklist: readonly StudioGuideChecklistResult[];
  readonly nextLabel: string | null;
  readonly onNext: () => void;
}

export default function StudioGuidePanel({
  stepLabel,
  guide,
  checklist,
  nextLabel,
  onNext,
}: StudioGuidePanelProps) {
  const required = checklist.filter((item) => !item.optional);
  const requiredDone = required.filter((item) => item.done).length;

  return (
    <div className="studio-guide-panel" data-testid="studio-guide">
      <header className="studio-guide-header">
        <p className="studio-guide-kicker">Guide · {stepLabel}</p>
        <p className="studio-guide-intro">{guide.intro}</p>
      </header>

      <section className="studio-guide-section" aria-labelledby="studio-guide-todo">
        <h2 id="studio-guide-todo" className="studio-guide-title">
          What to do here
          {required.length > 0 ? (
            <span className="studio-guide-count">
              {requiredDone} of {required.length} done
            </span>
          ) : null}
        </h2>
        <ul className="studio-guide-checklist" data-testid="studio-guide-checklist">
          {checklist.map((item) => (
            <li
              key={item.id}
              className={item.done ? "studio-guide-item is-done" : "studio-guide-item"}
            >
              <span className="studio-guide-box" aria-hidden="true">
                {item.done ? "✓" : ""}
              </span>
              <span className="studio-guide-text">
                <span className="visually-hidden">{item.done ? "Done: " : "To do: "}</span>
                {item.text}
                {item.optional ? <span className="studio-guide-optional"> (optional)</span> : null}
              </span>
            </li>
          ))}
        </ul>
      </section>

      <section className="studio-guide-section studio-guide-tips" aria-labelledby="studio-guide-tips">
        <h2 id="studio-guide-tips" className="studio-guide-title">
          Tips
        </h2>
        {guide.tips.map((tip) => (
          <p key={tip} className="studio-guide-tip">
            {tip}
          </p>
        ))}
      </section>

      <section className="studio-guide-section" aria-labelledby="studio-guide-stuck">
        <h2 id="studio-guide-stuck" className="studio-guide-title">
          Stuck?
        </h2>
        {guide.questions.map((entry) => (
          <details key={entry.question} className="studio-guide-question">
            <summary>{entry.question}</summary>
            <p>{entry.answer}</p>
          </details>
        ))}
      </section>

      {nextLabel ? (
        <div className="studio-guide-next">
          <span className="studio-guide-next-hint">When you’re ready</span>
          <button
            type="button"
            className="studio-btn studio-btn-primary"
            onClick={onNext}
            data-testid="studio-guide-next"
          >
            Next: {nextLabel} →
          </button>
        </div>
      ) : null}
    </div>
  );
}
