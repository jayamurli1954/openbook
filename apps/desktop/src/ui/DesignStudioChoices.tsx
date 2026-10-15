/**
 * SPDX-License-Identifier: Apache-2.0
 *
 * ADR-0036 Slice 2 — guided design choices; ADR-0039 Slice 4 layout.
 * Ready-made looks, then theme, body typeface, heading typeface, body size,
 * and line height, with a live sample beside them.
 */
import { useState } from "react";
import type { DesignStudioChoices } from "../workflow/domain/designStudioChoices.js";
import {
  BUNDLED_BOOK_FONTS,
  DESIGN_PRESETS,
  previewFontStack,
} from "../workflow/domain/designStudioPresets.js";

export interface DesignStudioChoicesProps {
  readonly choices: DesignStudioChoices;
  readonly onChanged?: () => void;
  readonly onStatus?: (message: string, kind: "ok" | "error") => void;
}

function parseMeasure(value: string): number {
  if (value.trim() === "") return Number.NaN;
  return Number(value);
}

export default function DesignStudioChoices({
  choices,
  onChanged,
  onStatus,
}: DesignStudioChoicesProps) {
  const initial = choices.read();
  const [themeId, setThemeId] = useState(initial.theme.id);
  const [themeName, setThemeName] = useState(initial.theme.name);
  const [bodyFont, setBodyFont] = useState(initial.typography.bodyFontFamily);
  const [headingFont, setHeadingFont] = useState(initial.typography.headingFontFamily);
  const [bodySize, setBodySize] = useState(String(initial.typography.bodySizePt));
  const [lineHeight, setLineHeight] = useState(String(initial.typography.lineHeight));

  const syncFromBook = () => {
    const applied = choices.read();
    setThemeId(applied.theme.id);
    setThemeName(applied.theme.name);
    setBodyFont(applied.typography.bodyFontFamily);
    setHeadingFont(applied.typography.headingFontFamily);
    setBodySize(String(applied.typography.bodySizePt));
    setLineHeight(String(applied.typography.lineHeight));
  };

  const apply = (result: ReturnType<DesignStudioChoices["setTheme"]>, success: string) => {
    if (!result.ok) {
      onStatus?.(result.message, "error");
      return;
    }
    syncFromBook();
    onStatus?.(success, "ok");
    onChanged?.();
  };

  const previewSizePx = Number.isFinite(parseMeasure(bodySize)) ? parseMeasure(bodySize) * (4 / 3) : 15;
  const previewLeading = Number.isFinite(parseMeasure(lineHeight)) ? parseMeasure(lineHeight) : 1.4;

  return (
    <section
      className="design-studio-choices"
      data-testid="design-studio-choices"
      aria-label="Design"
    >
      <header className="studio-step-header">
        <h2>Design</h2>
        <p className="studio-step-lede">Pick a look. Your words stay the same; only how they appear changes.</p>
      </header>

      <div className="design-presets" role="group" aria-label="Ready-made looks">
        {DESIGN_PRESETS.map((preset) => (
          <button
            key={preset.id}
            type="button"
            className="design-preset"
            aria-pressed={themeId === preset.theme.id}
            data-testid={`design-preset-${preset.id}`}
            onClick={() => apply(choices.applyPreset(preset), `Applied the ${preset.name} look.`)}
          >
            <span
              className="design-preset-sample"
              aria-hidden="true"
              style={{ fontFamily: previewFontStack(preset.typography.bodyFontFamily, preset.id === "modern" ? "sans-serif" : "serif") }}
            >
              {preset.id === "kannada" ? "ಅಆ" : "Aa"}
            </span>
            <span className="design-preset-name">{preset.name}</span>
            <span className="design-preset-description">{preset.description}</span>
          </button>
        ))}
      </div>

      <div className="design-studio-layout">
        <div className="design-studio-fields">
          <fieldset className="design-fieldset">
            <legend>Theme</legend>
            <label>
              Theme name
              <input
                type="text"
                aria-label="Theme name"
                data-testid="design-studio-theme-name"
                value={themeName}
                onChange={(event) => setThemeName(event.target.value)}
              />
            </label>
            <label>
              Theme id
              <input
                type="text"
                aria-label="Theme id"
                data-testid="design-studio-theme-id"
                value={themeId}
                onChange={(event) => setThemeId(event.target.value)}
              />
            </label>
            <button
              type="button"
              className="studio-btn"
              data-testid="design-studio-apply-theme"
              onClick={() =>
                apply(choices.setTheme(themeId, themeName), `Set theme to “${themeName.trim()}”.`)
              }
            >
              Apply theme
            </button>
          </fieldset>

          <fieldset className="design-fieldset">
            <legend>Type</legend>
            <label>
              Body typeface
              <input
                type="text"
                list="design-bundled-fonts"
                aria-label="Body typeface"
                data-testid="design-studio-body-font"
                value={bodyFont}
                onChange={(event) => setBodyFont(event.target.value)}
              />
            </label>
            <label>
              Heading typeface
              <input
                type="text"
                list="design-bundled-fonts"
                aria-label="Heading typeface"
                data-testid="design-studio-heading-font"
                value={headingFont}
                onChange={(event) => setHeadingFont(event.target.value)}
              />
            </label>
            <datalist id="design-bundled-fonts">
              {BUNDLED_BOOK_FONTS.map((font) => (
                <option key={font} value={font} />
              ))}
            </datalist>
            <div className="design-measures">
              <label>
                Body size (pt)
                <input
                  type="text"
                  inputMode="decimal"
                  aria-label="Body size in points"
                  data-testid="design-studio-body-size"
                  value={bodySize}
                  onChange={(event) => setBodySize(event.target.value)}
                />
              </label>
              <label>
                Line height
                <input
                  type="text"
                  inputMode="decimal"
                  aria-label="Line height"
                  data-testid="design-studio-line-height"
                  value={lineHeight}
                  onChange={(event) => setLineHeight(event.target.value)}
                />
              </label>
            </div>
            <button
              type="button"
              className="studio-btn"
              data-testid="design-studio-apply-typography"
              onClick={() =>
                apply(
                  choices.setTypography({
                    bodyFontFamily: bodyFont,
                    headingFontFamily: headingFont,
                    bodySizePt: parseMeasure(bodySize),
                    lineHeight: parseMeasure(lineHeight),
                  }),
                  "Updated typography.",
                )
              }
            >
              Apply typography
            </button>
          </fieldset>
        </div>

        <figure className="design-preview" aria-label="Live preview" data-testid="design-live-preview">
          <figcaption>Live preview</figcaption>
          <p
            className="design-preview-heading"
            style={{ fontFamily: previewFontStack(headingFont, "serif") }}
          >
            Chapter One
          </p>
          <p
            className="design-preview-body"
            style={{
              fontFamily: previewFontStack(bodyFont, "serif"),
              fontSize: `${previewSizePx}px`,
              lineHeight: previewLeading,
            }}
          >
            The river begins as a rumour. High above the hills, water gathers in the moss and slips
            between stones too small to have names.
          </p>
          <p className="design-preview-note">
            The preview uses fonts installed on this computer. Your PDF uses the chosen fonts; ebook
            readers may let people pick their own.
          </p>
        </figure>
      </div>
    </section>
  );
}
