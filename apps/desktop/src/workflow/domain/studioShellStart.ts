// SPDX-License-Identifier: Apache-2.0
/**
 * ADR-0039 Slice 6 — start screen book types.
 *
 * "What are you writing?" choices. Each pre-fills the Guided Start New Book
 * form (book type and language) and names a Design look to apply once the
 * book exists. No Book Model change: book type stays Guided Start
 * terminology (ADR-0033), and the look uses the ADR-0036 design port.
 */
import { DESIGN_PRESETS, type DesignPreset } from "./designStudioPresets.js";

export interface StudioBookType {
  readonly id: string;
  readonly label: string;
  readonly description: string;
  /** Value for the Guided Start "Book type" field. */
  readonly bookType: string;
  readonly language: string;
  readonly presetId: DesignPreset["id"];
  /** Sample glyphs for the card. */
  readonly sample: string;
}

export const STUDIO_BOOK_TYPES: readonly StudioBookType[] = [
  {
    id: "novel",
    label: "Novel",
    description: "Classic look, English.",
    bookType: "Novel",
    language: "en",
    presetId: "classic",
    sample: "Aa",
  },
  {
    id: "memoir",
    label: "Memoir",
    description: "Classic look, English.",
    bookType: "Memoir",
    language: "en",
    presetId: "classic",
    sample: "Aa",
  },
  {
    id: "guide",
    label: "How-to guide",
    description: "Modern look, English.",
    bookType: "How-to guide",
    language: "en",
    presetId: "modern",
    sample: "Aa",
  },
  {
    id: "poetry",
    label: "Poetry",
    description: "Classic look, English.",
    bookType: "Poetry",
    language: "en",
    presetId: "classic",
    sample: "Aa",
  },
  {
    id: "kannada",
    label: "Kannada book",
    description: "Kannada look and language.",
    bookType: "Kannada book",
    language: "kn",
    presetId: "kannada",
    sample: "ಅಆ",
  },
] as const;

export function findDesignPresetForBookType(type: StudioBookType): DesignPreset {
  const preset = DESIGN_PRESETS.find((candidate) => candidate.id === type.presetId);
  if (!preset) throw new Error(`No design look named ${type.presetId}`);
  return preset;
}
