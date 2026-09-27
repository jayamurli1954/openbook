/**
 * SPDX-License-Identifier: Apache-2.0
 *
 * ADR-0034 Slice 4 — Insert Image chrome.
 * Delegates to WritingStudioImageAdapter. No Tauri/FS/coordinator imports.
 */
import { useState } from "react";
import type { IWritingStudioImageAdapter } from "../workflow/domain/writingStudioImageAdapter.js";
import {
  formatWritingStudioImageFailure,
  formatWritingStudioImageInserted,
} from "../workflow/domain/writingStudioUx.js";

export interface WritingStudioImageButtonProps {
  readonly imageAdapter: IWritingStudioImageAdapter;
  readonly sectionId: string | null;
  readonly disabled?: boolean;
  readonly onInserted?: () => void;
  readonly onStatus?: (message: string, kind: "ok" | "error" | "info") => void;
}

export default function WritingStudioImageButton({
  imageAdapter,
  sectionId,
  disabled = false,
  onInserted,
  onStatus,
}: WritingStudioImageButtonProps) {
  const [busy, setBusy] = useState(false);

  const onClick = async () => {
    if (busy) return;
    setBusy(true);
    try {
      const result = await imageAdapter.insertImage({ sectionId });
      if (!result.ok) {
        const failure = formatWritingStudioImageFailure(
          result.code,
          result.message,
        );
        onStatus?.(failure.message, failure.kind);
        return;
      }
      onStatus?.(
        formatWritingStudioImageInserted(result.assetRef.fileName),
        "ok",
      );
      onInserted?.();
    } finally {
      setBusy(false);
    }
  };

  return (
    <button
      type="button"
      className="writing-studio-image-insert"
      data-testid="writing-studio-insert-image"
      disabled={disabled || busy || !sectionId}
      onClick={() => {
        void onClick();
      }}
    >
      {busy ? "Inserting…" : "Insert image"}
    </button>
  );
}
