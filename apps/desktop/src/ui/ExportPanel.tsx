/**
 * SPDX-License-Identifier: Apache-2.0
 *
 * Export surface (ADR-0030), presented as export cards in the
 * ADR-0039 Publish step. Delegates generation and filesystem writes to
 * DesktopExportController / ExportSaveHostAdapter. No engine or Tauri
 * details live here.
 */
import { useState } from "react";
import type { ExportFormat } from "../workflow/domain/exportHostAdapter.js";
import { toAuthorMessage } from "../workflow/domain/studioShellErrors.js";
import {
  DesktopExportController,
  type ExportUiStatus,
} from "../host/desktopExportController.js";

interface ExportCard {
  readonly format: ExportFormat;
  readonly title: string;
  readonly description: string;
  readonly primary: boolean;
}

const CARDS: readonly ExportCard[] = [
  {
    format: "epub",
    title: "EPUB ebook",
    description: "For Kindle, Apple Books, Kobo, and other ebook stores.",
    primary: true,
  },
  { format: "pdf", title: "PDF", description: "A reading copy to share or print.", primary: false },
  { format: "html", title: "Web page", description: "HTML you can put on a website.", primary: false },
];

export interface ExportPanelProps {
  readonly controller: DesktopExportController;
  /** True when the book has a clean check for its current state. */
  readonly ready: boolean;
}

export default function ExportPanel({ controller, ready }: ExportPanelProps) {
  const [status, setStatus] = useState<ExportUiStatus | null>(null);
  const [busy, setBusy] = useState(false);
  const canExport = ready && controller.canExport();

  const runExport = async (format: ExportFormat) => {
    setBusy(true);
    setStatus({ phase: "exporting", format, message: `Exporting ${format.toUpperCase()}…` });
    try {
      setStatus(await controller.exportFormat(format));
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="export-panel" aria-label="Export your book">
      <div className="export-cards">
        {CARDS.map((card) => (
          <section key={card.format} className="export-card" aria-label={card.title}>
            <h3>{card.title}</h3>
            <p>{card.description}</p>
            <button
              type="button"
              className={card.primary ? "studio-btn studio-btn-primary" : "studio-btn"}
              data-testid={`export-${card.format}`}
              disabled={!canExport || busy}
              title={canExport ? `Choose where to save the ${card.title}` : "Check your book first"}
              onClick={() => void runExport(card.format)}
            >
              Export {card.format.toUpperCase()}…
            </button>
          </section>
        ))}
      </div>
      {status ? (
        <p
          className={`export-status export-status-${status.phase}`}
          role="status"
          data-testid="export-status"
        >
          {status.phase === "failed" ? toAuthorMessage(status.message, "export") : status.message}
        </p>
      ) : null}
    </section>
  );
}
