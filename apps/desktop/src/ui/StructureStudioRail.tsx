/**
 * SPDX-License-Identifier: Apache-2.0
 *
 * ADR-0035 Slice 3–5 — Structure Studio matter rail.
 * Add, rename, and reorder within a matter. Move between matters and set a
 * role that is valid for the section's current matter. No remove control.
 */
import { useState } from "react";
import type { MatterKind } from "@openbook/book-model";
import type { StructureStudioMatterRail } from "../workflow/domain/structureStudioMatterRail.js";
import { structureStudioEmptyMatterCopy } from "../workflow/domain/structureStudioUx.js";

const MATTER_LABEL: Record<MatterKind, string> = {
  front: "Front matter",
  main: "Main matter",
  back: "Back matter",
};

const OTHER_MATTERS: Record<MatterKind, readonly MatterKind[]> = {
  front: ["main", "back"],
  main: ["front", "back"],
  back: ["front", "main"],
};

export interface StructureStudioRailProps {
  readonly rail: StructureStudioMatterRail;
  readonly onChanged?: () => void;
  readonly onSelectSection?: (sectionId: string) => void;
  readonly onStatus?: (message: string, kind: "ok" | "error") => void;
}

export default function StructureStudioRail({
  rail,
  onChanged,
  onSelectSection,
  onStatus,
}: StructureStudioRailProps) {
  const [revision, setRevision] = useState(0);
  const [addDraft, setAddDraft] = useState<Record<MatterKind, string>>({
    front: "",
    main: "",
    back: "",
  });
  const [renameDraft, setRenameDraft] = useState<Record<string, string>>({});
  const [moveDraft, setMoveDraft] = useState<Record<string, MatterKind>>({});
  const [roleDraft, setRoleDraft] = useState<Record<string, string>>({});

  const groups = rail.list();
  void revision;

  const apply = (
    result: ReturnType<StructureStudioMatterRail["add"]>,
    success: string,
  ) => {
    if (!result.ok) {
      onStatus?.(result.message, "error");
      return;
    }
    setRevision((value) => value + 1);
    onStatus?.(success, "ok");
    onChanged?.();
  };

  return (
    <section
      className="structure-studio-rail"
      data-testid="structure-studio-rail"
      aria-label="Structure"
    >
      <h3>Structure</h3>
      {groups.map((group) => (
        <div
          key={group.matter}
          className="structure-studio-group"
          data-testid={`structure-studio-group-${group.matter}`}
        >
          <h4>{MATTER_LABEL[group.matter]}</h4>
          {group.sections.length === 0 ? (
            <p
              className="note structure-studio-empty"
              data-testid={`structure-studio-empty-${group.matter}`}
            >
              {structureStudioEmptyMatterCopy(group.matter)}
            </p>
          ) : null}
          <ul className="structure-studio-sections">
            {group.sections.map((section) => {
              const draft = renameDraft[section.id] ?? section.title;
              const moveTo =
                moveDraft[section.id] ?? OTHER_MATTERS[group.matter][0];
              const role = roleDraft[section.id] ?? section.role;
              const roles = rail.rolesFor(group.matter);
              return (
                <li key={section.id}>
                  <button
                    type="button"
                    className="structure-studio-section"
                    data-testid={`structure-studio-section-${section.id}`}
                    onClick={() => onSelectSection?.(section.id)}
                  >
                    {section.title}
                  </button>
                  <input
                    type="text"
                    aria-label={`Rename ${section.title}`}
                    data-testid={`structure-studio-rename-input-${section.id}`}
                    value={draft}
                    onChange={(event) =>
                      setRenameDraft((current) => ({
                        ...current,
                        [section.id]: event.target.value,
                      }))
                    }
                  />
                  <button
                    type="button"
                    data-testid={`structure-studio-rename-${section.id}`}
                    onClick={() =>
                      apply(
                        rail.rename(section.id, draft),
                        `Renamed section to “${draft.trim()}”.`,
                      )
                    }
                  >
                    Rename
                  </button>
                  <button
                    type="button"
                    data-testid={`structure-studio-up-${section.id}`}
                    disabled={section.index === 0}
                    onClick={() =>
                      apply(
                        rail.reorder(group.matter, section.index, section.index - 1),
                        "Moved section up.",
                      )
                    }
                  >
                    Up
                  </button>
                  <button
                    type="button"
                    data-testid={`structure-studio-down-${section.id}`}
                    disabled={section.index === group.sections.length - 1}
                    onClick={() =>
                      apply(
                        rail.reorder(group.matter, section.index, section.index + 1),
                        "Moved section down.",
                      )
                    }
                  >
                    Down
                  </button>
                  <label>
                    Move to
                    <select
                      aria-label={`Move ${section.title} to`}
                      data-testid={`structure-studio-move-target-${section.id}`}
                      value={moveTo}
                      onChange={(event) =>
                        setMoveDraft((current) => ({
                          ...current,
                          [section.id]: event.target.value as MatterKind,
                        }))
                      }
                    >
                      {OTHER_MATTERS[group.matter].map((matter) => (
                        <option key={matter} value={matter}>
                          {MATTER_LABEL[matter]}
                        </option>
                      ))}
                    </select>
                  </label>
                  <button
                    type="button"
                    data-testid={`structure-studio-move-${section.id}`}
                    onClick={() =>
                      apply(
                        rail.move(section.id, moveTo),
                        `Moved section to ${MATTER_LABEL[moveTo]}.`,
                      )
                    }
                  >
                    Move
                  </button>
                  <label>
                    Role
                    <select
                      aria-label={`Role for ${section.title}`}
                      data-testid={`structure-studio-role-${section.id}`}
                      value={roles.includes(role) ? role : roles[0]}
                      onChange={(event) =>
                        setRoleDraft((current) => ({
                          ...current,
                          [section.id]: event.target.value,
                        }))
                      }
                    >
                      {roles.map((option) => (
                        <option key={option} value={option}>
                          {option}
                        </option>
                      ))}
                    </select>
                  </label>
                  <button
                    type="button"
                    data-testid={`structure-studio-set-role-${section.id}`}
                    onClick={() =>
                      apply(
                        rail.setRole(section.id, role),
                        `Set role to “${role}”.`,
                      )
                    }
                  >
                    Set role
                  </button>
                </li>
              );
            })}
          </ul>
          <div className="structure-studio-add">
            <input
              type="text"
              aria-label={`New ${MATTER_LABEL[group.matter]} title`}
              data-testid={`structure-studio-add-input-${group.matter}`}
              value={addDraft[group.matter]}
              placeholder="Section title"
              onChange={(event) =>
                setAddDraft((current) => ({
                  ...current,
                  [group.matter]: event.target.value,
                }))
              }
            />
            <button
              type="button"
              data-testid={`structure-studio-add-${group.matter}`}
              onClick={() => {
                const title = addDraft[group.matter];
                const result = rail.add(group.matter, title);
                if (!result.ok) {
                  onStatus?.(result.message, "error");
                  return;
                }
                setAddDraft((current) => ({ ...current, [group.matter]: "" }));
                setRevision((value) => value + 1);
                onStatus?.(`Added “${title.trim()}”.`, "ok");
                onChanged?.();
              }}
            >
              Add
            </button>
          </div>
        </div>
      ))}
    </section>
  );
}
