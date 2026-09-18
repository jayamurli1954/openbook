// SPDX-License-Identifier: Apache-2.0
/**
 * Gate 9 Slice 4 — compose ExportSaveHostAdapter with Tauri Save-As ports.
 */
import type { ExportCoordinatorPort } from "../workflow/domain/exportHostAdapter.js";
import { ExportSaveHostAdapter } from "../workflow/domain/exportSaveHostAdapter.js";
import { SaveAsHostAdapter } from "../workflow/domain/saveAsHostAdapter.js";
import {
  createTauriOverwriteConfirmationPort,
  createTauriSaveAsDialogPort,
  createTauriSaveAsFileSystemPort,
} from "./tauriSaveAsPorts.js";

export function createTauriExportSaveHost(
  coordinator: ExportCoordinatorPort,
): ExportSaveHostAdapter {
  const saveAs = new SaveAsHostAdapter(
    createTauriSaveAsDialogPort(),
    createTauriOverwriteConfirmationPort(),
    createTauriSaveAsFileSystemPort(),
  );
  return ExportSaveHostAdapter.fromPorts(coordinator, saveAs);
}
