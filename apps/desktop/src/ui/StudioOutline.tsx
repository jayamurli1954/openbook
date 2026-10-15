/**
 * SPDX-License-Identifier: Apache-2.0
 *
 * ADR-0039 Slice 3 — book outline.
 * One tree of front matter, chapters, and back matter. Selecting an item
 * opens it in Write. Add, rename, and delete apply to chapters; moving parts
 * and front or back matter live in the Structure step.
 */
import type { StudioOutlineGroup } from "../workflow/domain/studioShellOutline.js";

export interface StudioOutlineProps {
  readonly groups: readonly StudioOutlineGroup[];
  readonly selectedId: string | null;
  readonly selectedIsChapter: boolean;
  readonly canDeleteChapter: boolean;
  readonly onSelect: (sectionId: string) => void;
  readonly onAddChapter: () => void;
  readonly onRenameChapter: () => void;
  readonly onDeleteChapter: () => void;
}

export default function StudioOutline({
  groups,
  selectedId,
  selectedIsChapter,
  canDeleteChapter,
  onSelect,
  onAddChapter,
  onRenameChapter,
  onDeleteChapter,
}: StudioOutlineProps) {
  return (
    <div className="studio-outline-tree" data-testid="studio-outline">
      {groups.map((group) => (
        <section key={group.matter} className="studio-outline-group" aria-label={group.label}>
          <h2 className="studio-outline-heading">{group.label}</h2>
          {group.items.length === 0 ? (
            <p className="studio-outline-empty">None yet</p>
          ) : (
            <ul className="studio-outline-list">
              {group.items.map((item) => {
                const current = item.id === selectedId;
                return (
                  <li key={item.id}>
                    <button
                      type="button"
                      className={current ? "studio-outline-item is-current" : "studio-outline-item"}
                      aria-current={current ? "true" : undefined}
                      onClick={() => onSelect(item.id)}
                      data-testid={`outline-${item.id}`}
                    >
                      <span className="studio-outline-title">{item.title}</span>
                      <span className="studio-outline-words" aria-label={`${item.words} words`}>
                        {item.wordsLabel}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
          {group.matter === "main" ? (
            <div className="studio-outline-actions">
              <button type="button" className="studio-btn" onClick={onAddChapter}>
                + Add chapter
              </button>
              {selectedIsChapter ? (
                <>
                  <button type="button" className="studio-btn" onClick={onRenameChapter}>
                    Rename
                  </button>
                  <button
                    type="button"
                    className="studio-btn"
                    onClick={onDeleteChapter}
                    disabled={!canDeleteChapter}
                    title={canDeleteChapter ? "Delete this chapter" : "A book needs at least one chapter"}
                  >
                    Delete
                  </button>
                </>
              ) : null}
            </div>
          ) : null}
        </section>
      ))}
    </div>
  );
}
