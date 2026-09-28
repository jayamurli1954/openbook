/**
 * SPDX-License-Identifier: Apache-2.0
 *
 * ADR-0036 Slice 2 — guided design choices.
 * Theme, body typeface, heading typeface, body size, and line height.
 */
import { useState } from "react";
import type { DesignStudioChoices } from "../workflow/domain/designStudioChoices.js";

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
  const [revision, setRevision] = useState(0);
  const [themeId, setThemeId] = useState(initial.theme.id);
  const [themeName, setThemeName] = useState(initial.theme.name);
  const [bodyFont, setBodyFont] = useState(initial.typography.bodyFontFamily);
  const [headingFont, setHeadingFont] = useState(initial.typography.headingFontFamily);
  const [bodySize, setBodySize] = useState(String(initial.typography.bodySizePt));
  const [lineHeight, setLineHeight] = useState(String(initial.typography.lineHeight));
  void revision;

  const apply = (
    result: ReturnType<DesignStudioChoices["setTheme"]>,
    success: string,
  ) => {
    if (!result.ok) {
      onStatus?.(result.message, "error");
      return;
    }
    const applied = choices.read();
    setThemeId(applied.theme.id);
    setThemeName(applied.theme.name);
    setBodyFont(applied.typography.bodyFontFamily);
    setHeadingFont(applied.typography.headingFontFamily);
    setBodySize(String(applied.typography.bodySizePt));
    setLineHeight(String(applied.typography.lineHeight));
    setRevision((value) => value + 1);
    onStatus?.(success, "ok");
    onChanged?.();
  };

  return (
    <section
      className="design-studio-choices"
      data-testid="design-studio-choices"
      aria-label="Design"
    >
      <h3>Design</h3>
      <div className="design-studio-fields">
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
          data-testid="design-studio-apply-theme"
          onClick={() =>
            apply(choices.setTheme(themeId, themeName), `Set theme to “${themeName.trim()}”.`)
          }
        >
          Apply theme
        </button>
        <label>
          Body typeface
          <input
            type="text"
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
            aria-label="Heading typeface"
            data-testid="design-studio-heading-font"
            value={headingFont}
            onChange={(event) => setHeadingFont(event.target.value)}
          />
        </label>
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
        <button
          type="button"
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
      </div>
    </section>
  );
}
