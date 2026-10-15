// SPDX-License-Identifier: Apache-2.0
/**
 * ADR-0036 Slice 2 — guided design choices.
 *
 * Theme, body typeface, heading typeface, body size, and line height.
 * Commands go through the Slice 1 design port.
 */
import type { BookDesign, DesignStudioResult, DesignStudioSessionPort } from "./designStudioContract.js";
import { executeDesignCommand, readBookDesign } from "./designStudioContract.js";
import type { DesignPreset } from "./designStudioPresets.js";

export interface DesignStudioChoices {
  read(): BookDesign;
  setTheme(id: string, name: string): DesignStudioResult;
  setTypography(input: {
    bodyFontFamily: string;
    headingFontFamily: string;
    bodySizePt: number;
    lineHeight: number;
  }): DesignStudioResult;
  /** ADR-0039 Slice 4: apply a ready-made look (theme, then typography). */
  applyPreset(preset: DesignPreset): DesignStudioResult;
}

export function createDesignStudioChoices(
  session: DesignStudioSessionPort,
): DesignStudioChoices {
  return {
    read(): BookDesign {
      return readBookDesign(session.getBook());
    },
    setTheme(id: string, name: string): DesignStudioResult {
      return executeDesignCommand(session, { type: "set-theme", id, name });
    },
    setTypography(input): DesignStudioResult {
      return executeDesignCommand(session, { type: "set-typography", ...input });
    },
    applyPreset(preset: DesignPreset): DesignStudioResult {
      const theme = executeDesignCommand(session, {
        type: "set-theme",
        id: preset.theme.id,
        name: preset.theme.name,
      });
      if (!theme.ok) return theme;
      return executeDesignCommand(session, { type: "set-typography", ...preset.typography });
    },
  };
}
