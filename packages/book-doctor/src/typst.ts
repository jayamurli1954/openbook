// SPDX-License-Identifier: Apache-2.0
import { mapTypstSeverity } from "./mapping.js";
import type { BookDiagnostic, TypstDiagnosticInput } from "./types.js";

/**
 * Normalize injected Typst compiler diagnostics (ADR-0018 §2.6.C).
 * Does not import or invoke @openbook/pdf.
 */
export function normalizeTypstDiagnosticsSync(
  input: TypstDiagnosticInput,
): readonly BookDiagnostic[] {
  const messages = input?.messages ?? [];
  return messages.map((msg, index) => ({
    source: "typst-compiler" as const,
    severity: mapTypstSeverity(msg.severity),
    code: msg.code ?? `typst-${msg.severity}-${String(index)}`,
    message: msg.message,
    location:
      msg.file !== undefined || msg.line !== undefined || msg.column !== undefined
        ? {
            file: msg.file,
            line: msg.line,
            column: msg.column,
          }
        : undefined,
  }));
}
