/**
 * SPDX-License-Identifier: Apache-2.0
 *
 * Gate 9 Slice 4 — thin React export surface (ADR-0030).
 * Delegates generation and filesystem writes to DesktopExportController /
 * ExportSaveHostAdapter. No engine or Tauri details live here.
 */
import { useState } from "react";
import type { WorkflowStage } from "@openbook/workflow";
import type { ExportFormat } from "../workflow/domain/exportHostAdapter.js";
import {
  DesktopExportController,
  type ExportUiStatus,
} from "../host/desktopExportController.js";

const FORMATS: readonly ExportFormat[] = ["epub", "html", "pdf"];

export interface ExportPanelProps {
  readonly controller: DesktopExportController;
  readonly stage: WorkflowStage;
  readonly jobStatus: string;
  readonly validationClean: boolean | null;
  readonly onRunValidation?: () => Promise<void>;
}

export default function ExportPanel({
  controller,
  stage,
  jobStatus,
  validationClean,
  onRunValidation,
}: ExportPanelProps) {
  const [status, setStatus] = useState<ExportUiStatus>({
    phase: "idle",
    message: "Export EPUB, HTML, or PDF through native Save As.",
  });
  const [busy, setBusy] = useState(false);
  const canExport = controller.canExport();
  const canValidate = stage === "VALIDATION" && Boolean(onRunValidation);

  const runExport = async (format: ExportFormat) => {
    setBusy(true);
    setStatus({
      phase: "exporting",
      format,
      message: `Exporting ${format.toUpperCase()}…`,
    });
    try {
      const next = await controller.exportFormat(format);
      setStatus(next);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="project-bar export-panel" aria-label="Export publication">
      <span className="project-binding">Export (Gate 9)</span>
      <p className="note">
        Uses DesktopStudioCoordinator for generation/verification and the Save-As
        host for destination selection and writes. Available in PREVIEW/PUBLISH
        after a clean Book Doctor report.
      </p>
      <p className="detail" data-testid="export-gate">
        Stage: {stage} · Job: {jobStatus} · Validation:{" "}
        {validationClean === null ? "not run" : validationClean ? "clean" : "unclean"}
      </p>
      <div className="project-actions">
        {canValidate ? (
          <button
            type="button"
            data-testid="export-run-validation"
            disabled={busy}
            onClick={() => {
              void (async () => {
                if (!onRunValidation) return;
                setBusy(true);
                try {
                  await onRunValidation();
                  setStatus({
                    phase: "idle",
                    message: "Validation finished. Advance to PREVIEW when clean.",
                  });
                } catch (error) {
                  setStatus({
                    phase: "failed",
                    message: error instanceof Error ? error.message : String(error),
                  });
                } finally {
                  setBusy(false);
                }
              })();
            }}
          >
            Run Book Doctor
          </button>
        ) : null}
        {FORMATS.map((format) => (
          <button
            key={format}
            type="button"
            data-testid={`export-${format}`}
            disabled={!canExport || busy}
            title={
              canExport
                ? `Export ${format.toUpperCase()} via Save As`
                : "Advance to PREVIEW or PUBLISH with a clean Book Doctor report"
            }
            onClick={() => void runExport(format)}
          >
            Export {format.toUpperCase()}
          </button>
        ))}
      </div>
      <p
        className={`detail status status-${
          status.phase === "succeeded"
            ? "ok"
            : status.phase === "failed"
              ? "error"
              : status.phase === "cancelled"
                ? "idle"
                : "running"
        }`}
        data-testid="export-status"
      >
        {status.message}
      </p>
    </div>
  );
}
