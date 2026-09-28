/**
 * SPDX-License-Identifier: Apache-2.0
 *
 * ADR-0035 Slice 4 — read-only navigation preview.
 * Shows Book reading order (title, matter, role). Does not edit the Book
 * and does not write a table of contents.
 */
import type { MatterKind } from "@openbook/book-model";
import type { BookNavigationEntry } from "../workflow/domain/structureStudioNavPreview.js";

const MATTER_LABEL: Record<MatterKind, string> = {
  front: "Front matter",
  main: "Main matter",
  back: "Back matter",
};

export interface StructureStudioNavPreviewProps {
  readonly entries: readonly BookNavigationEntry[];
}

export default function StructureStudioNavPreview({
  entries,
}: StructureStudioNavPreviewProps) {
  return (
    <section
      className="structure-studio-nav"
      data-testid="structure-studio-nav"
      aria-label="Navigation preview"
    >
      <h3>Navigation</h3>
      <p className="detail">Reading order from the Book.</p>
      <ol className="structure-studio-nav-list">
        {entries.map((entry) => (
          <li
            key={entry.id}
            data-testid={`structure-studio-nav-item-${entry.id}`}
          >
            <span className="structure-studio-nav-title">{entry.title}</span>
            <span className="structure-studio-nav-matter">
              {MATTER_LABEL[entry.matter]}
            </span>
            <span className="structure-studio-nav-role">{entry.role}</span>
          </li>
        ))}
      </ol>
    </section>
  );
}
