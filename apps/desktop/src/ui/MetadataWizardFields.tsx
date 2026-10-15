/**
 * SPDX-License-Identifier: Apache-2.0
 *
 * ADR-0037 Slice 2 — guided metadata fields.
 * Labeled fields for the in-scope Book.metadata. One Apply button.
 */
import { useState } from "react";
import type {
  MetadataFieldValues,
  MetadataWizardFields as MetadataWizardFieldsPort,
} from "../workflow/domain/metadataWizardFields.js";

export interface MetadataWizardFieldsProps {
  readonly fields: MetadataWizardFieldsPort;
  readonly onChanged?: () => void;
  readonly onStatus?: (message: string, kind: "ok" | "error") => void;
}

type FieldKey = keyof MetadataFieldValues;

interface FieldSpec {
  readonly key: FieldKey;
  readonly label: string;
  readonly kind: "line" | "lines";
  readonly hint?: string;
  /** ADR-0039 Slice 4 grouping; "wide" fields span both columns. */
  readonly group: FieldGroupId;
  readonly wide?: boolean;
}

type FieldGroupId = "essentials" | "publishing" | "discovery";

const GROUPS: readonly { readonly id: FieldGroupId; readonly title: string }[] = [
  { id: "essentials", title: "Essentials" },
  { id: "publishing", title: "Publishing" },
  { id: "discovery", title: "Help readers find it" },
];

const FIELDS: readonly FieldSpec[] = [
  { key: "title", label: "Title", kind: "line", hint: "Required.", group: "essentials" },
  { key: "subtitle", label: "Subtitle", kind: "line", group: "essentials" },
  { key: "authors", label: "Authors", kind: "lines", hint: "One author per line.", group: "essentials" },
  {
    key: "contributors",
    label: "Contributors",
    kind: "lines",
    hint: "Editors, illustrators, translators. One per line.",
    group: "essentials",
  },
  {
    key: "language",
    label: "Language",
    kind: "line",
    hint: "Required. A language tag such as en or kn.",
    group: "essentials",
  },
  {
    key: "identifier",
    label: "ISBN or identifier",
    kind: "line",
    hint: "Optional. OpenBook does not check the ISBN.",
    group: "publishing",
  },
  { key: "publisher", label: "Publisher", kind: "line", group: "publishing" },
  {
    key: "publishedAt",
    label: "Publication date",
    kind: "line",
    hint: "For example 2026-10-13.",
    group: "publishing",
  },
  { key: "copyright", label: "Copyright", kind: "line", group: "publishing" },
  { key: "rights", label: "Rights", kind: "line", group: "publishing" },
  { key: "description", label: "Description", kind: "lines", group: "discovery", wide: true },
  { key: "subjects", label: "Subjects", kind: "lines", hint: "One subject per line.", group: "discovery", wide: true },
];

export default function MetadataWizardFields({
  fields,
  onChanged,
  onStatus,
}: MetadataWizardFieldsProps) {
  const [values, setValues] = useState<MetadataFieldValues>(() => fields.read());

  const setField = (key: FieldKey, value: string) => {
    setValues((current) => ({ ...current, [key]: value }));
  };

  const apply = () => {
    const result = fields.apply(values);
    if (!result.ok) {
      // Keep what the author typed so they can fix it.
      onStatus?.(result.message, "error");
      return;
    }
    setValues(fields.read());
    onStatus?.("Updated book details.", "ok");
    onChanged?.();
  };

  return (
    <section
      className="metadata-wizard-fields"
      data-testid="metadata-wizard-fields"
      aria-label="Book details"
    >
      <header className="studio-step-header">
        <h2>Book details</h2>
        <p className="studio-step-lede">
          Stores and readers see these. Only the title and language are required.
        </p>
      </header>
      {GROUPS.map((group) => (
        <fieldset key={group.id} className="metadata-wizard-group">
          <legend>{group.title}</legend>
          <div className="metadata-wizard-grid">
            {FIELDS.filter((spec) => spec.group === group.id).map((spec) => (
              <label key={spec.key} className={spec.wide ? "metadata-wizard-wide" : undefined}>
                {spec.label}
                {spec.kind === "lines" ? (
                  <textarea
                    aria-label={spec.label}
                    data-testid={`metadata-wizard-${spec.key}`}
                    rows={spec.key === "description" ? 4 : 2}
                    value={values[spec.key]}
                    onChange={(event) => setField(spec.key, event.target.value)}
                  />
                ) : (
                  <input
                    type="text"
                    aria-label={spec.label}
                    data-testid={`metadata-wizard-${spec.key}`}
                    value={values[spec.key]}
                    onChange={(event) => setField(spec.key, event.target.value)}
                  />
                )}
                {spec.hint ? <small>{spec.hint}</small> : null}
              </label>
            ))}
          </div>
        </fieldset>
      ))}
      <div className="metadata-wizard-actions">
        <button
          type="button"
          className="studio-btn studio-btn-primary"
          data-testid="metadata-wizard-apply"
          onClick={apply}
        >
          Save details
        </button>
      </div>
    </section>
  );
}
