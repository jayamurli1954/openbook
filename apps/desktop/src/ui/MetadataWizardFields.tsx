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
}

const FIELDS: readonly FieldSpec[] = [
  { key: "title", label: "Title", kind: "line", hint: "Required." },
  { key: "subtitle", label: "Subtitle", kind: "line" },
  { key: "authors", label: "Authors", kind: "lines", hint: "One author per line." },
  {
    key: "contributors",
    label: "Contributors",
    kind: "lines",
    hint: "Editors, illustrators, translators. One per line.",
  },
  {
    key: "language",
    label: "Language",
    kind: "line",
    hint: "Required. A language tag such as en or kn.",
  },
  {
    key: "identifier",
    label: "ISBN or identifier",
    kind: "line",
    hint: "Optional. OpenBook does not check the ISBN.",
  },
  { key: "publisher", label: "Publisher", kind: "line" },
  {
    key: "publishedAt",
    label: "Publication date",
    kind: "line",
    hint: "For example 2026-10-13.",
  },
  { key: "copyright", label: "Copyright", kind: "line" },
  { key: "rights", label: "Rights", kind: "line" },
  { key: "description", label: "Description", kind: "lines" },
  { key: "subjects", label: "Subjects", kind: "lines", hint: "One subject per line." },
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
      <h3>Book details</h3>
      <div className="metadata-wizard-grid">
        {FIELDS.map((spec) => (
          <label key={spec.key}>
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
        <button type="button" data-testid="metadata-wizard-apply" onClick={apply}>
          Apply
        </button>
      </div>
    </section>
  );
}
