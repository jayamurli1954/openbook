/**
 * SPDX-License-Identifier: Apache-2.0
 *
 * ADR-0038 Slice 3 — Cover Wizard chrome for the studio's Cover step.
 * All Book changes go through CoverWizardFields; this component only renders.
 */
import { useEffect, useState } from "react";
import type { CoverImageReport } from "../workflow/domain/coverImageChecks";
import type {
  CoverCandidate,
  CoverWizardFields,
  CoverWizardView,
} from "../workflow/domain/coverWizardFields";

export interface CoverWizardProps {
  fields: CoverWizardFields;
  onChanged?: () => void;
  onStatus?: (message: string, kind: "ok" | "error") => void;
}

/** A blob: URL for the bytes, revoked when the bytes change or the step closes. */
function usePreviewUrl(bytes: Uint8Array | null): string | null {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    if (!bytes) {
      setUrl(null);
      return;
    }
    const next = URL.createObjectURL(new Blob([bytes as BlobPart]));
    setUrl(next);
    return () => URL.revokeObjectURL(next);
  }, [bytes]);
  return url;
}

function CoverChecks({ report }: { report: CoverImageReport | null }) {
  if (!report) return null;
  const warnings = report.issues.filter((issue) => issue.severity === "warning");
  return (
    <div className="cover-wizard-checks" data-testid="cover-wizard-checks">
      {report.width !== undefined && report.height !== undefined ? (
        <p className="detail" data-testid="cover-wizard-size">
          {report.width} × {report.height} pixels
        </p>
      ) : null}
      {warnings.length > 0 ? (
        <ul className="cover-wizard-warnings" data-testid="cover-wizard-warnings">
          {warnings.map((issue) => (
            <li key={issue.code}>{issue.message}</li>
          ))}
        </ul>
      ) : (
        <p className="detail cover-wizard-ok">This picture looks good as a cover.</p>
      )}
    </div>
  );
}

export default function CoverWizard({ fields, onChanged, onStatus }: CoverWizardProps) {
  const [view, setView] = useState<CoverWizardView>({ cover: null, bytes: null, report: null });
  const [candidate, setCandidate] = useState<CoverCandidate | null>(null);
  const [altText, setAltText] = useState("");
  const [busy, setBusy] = useState(false);

  const reload = async () => {
    const next = await fields.read();
    setView(next);
    setAltText(next.cover?.altText ?? "");
  };

  useEffect(() => {
    // fields is stable for the life of the studio.
    void reload();
  }, [fields]);

  const shownBytes = candidate ? candidate.content : view.bytes;
  const previewUrl = usePreviewUrl(shownBytes);
  const shownReport = candidate ? candidate.report : view.report;
  const descriptionMissing = altText.trim().length === 0;

  const run = async (action: () => Promise<{ ok: boolean; message: string }>) => {
    setBusy(true);
    try {
      const result = await action();
      onStatus?.(result.message, result.ok ? "ok" : "error");
      if (result.ok) {
        setCandidate(null);
        await reload();
        onChanged?.();
      }
    } finally {
      setBusy(false);
    }
  };

  const choose = async () => {
    setBusy(true);
    try {
      const chosen = await fields.choose();
      if (chosen.kind === "rejected") onStatus?.(chosen.message, "error");
      if (chosen.kind === "chosen") {
        setCandidate(chosen.candidate);
        // A new picture needs its own description.
        setAltText("");
      }
    } finally {
      setBusy(false);
    }
  };

  const cancel = () => {
    setCandidate(null);
    setAltText(view.cover?.altText ?? "");
  };

  return (
    <section className="cover-wizard" data-testid="cover-wizard" aria-label="Cover">
      <header className="studio-step-header">
        <h2>Cover</h2>
        <p className="studio-step-lede">
          Add the picture readers see in stores and on their shelf. Use a JPEG or PNG, taller
          than it is wide, ideally at least 1600 × 2560 pixels.
        </p>
      </header>

      <div className="cover-wizard-body">
        <div className="cover-wizard-preview" data-testid="cover-wizard-preview">
          {previewUrl ? (
            <img src={previewUrl} alt={altText.trim() || "Cover preview"} />
          ) : (
            <p className="detail">No cover yet</p>
          )}
        </div>

        <div className="cover-wizard-panel">
          <CoverChecks report={shownReport} />

          {candidate || view.cover ? (
            <label className="cover-wizard-description">
              Describe the cover
              <textarea
                aria-label="Describe the cover"
                data-testid="cover-wizard-alt-text"
                rows={3}
                value={altText}
                onChange={(event) => setAltText(event.target.value)}
              />
              <small>For readers who use screen readers. Mention any title or words on the picture.</small>
            </label>
          ) : null}

          <div className="cover-wizard-actions">
            {candidate ? (
              <>
                <button
                  type="button"
                  className="studio-btn studio-btn-primary"
                  data-testid="cover-wizard-apply"
                  disabled={busy || descriptionMissing}
                  onClick={() => void run(() => fields.apply(candidate, altText))}
                >
                  Use as cover
                </button>
                <button
                  type="button"
                  className="studio-btn"
                  data-testid="cover-wizard-cancel"
                  disabled={busy}
                  onClick={cancel}
                >
                  Cancel
                </button>
              </>
            ) : view.cover ? (
              <>
                <button
                  type="button"
                  className="studio-btn studio-btn-primary"
                  data-testid="cover-wizard-update-description"
                  disabled={busy || descriptionMissing || altText.trim() === view.cover.altText}
                  onClick={() => void run(() => fields.updateDescription(altText))}
                >
                  Update description
                </button>
                <button
                  type="button"
                  className="studio-btn"
                  data-testid="cover-wizard-replace"
                  disabled={busy}
                  onClick={() => void choose()}
                >
                  Replace picture…
                </button>
                <button
                  type="button"
                  className="studio-btn"
                  data-testid="cover-wizard-remove"
                  disabled={busy}
                  onClick={() => void run(() => fields.remove())}
                >
                  Remove cover
                </button>
              </>
            ) : (
              <button
                type="button"
                className="studio-btn studio-btn-primary"
                data-testid="cover-wizard-choose"
                disabled={busy}
                onClick={() => void choose()}
              >
                Choose picture…
              </button>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
