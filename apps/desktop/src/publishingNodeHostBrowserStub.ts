// SPDX-License-Identifier: Apache-2.0
/**
 * Vite/webview stub for Node-only publishing host adapters.
 * Slice 5 does not expose export from the React surface.
 */
function unavailable(action: string): never {
  throw new Error(
    `${action} is only available in the Node/Tauri host, not the desktop webview.`,
  );
}

export const defaultPdfPublisher = {
  async publishPdf(): Promise<never> {
    unavailable("PDF export");
  },
};

export async function execFileWithAbortSignal(): Promise<never> {
  unavailable("PDF subprocess");
}

export async function invokeTypstCompileWithAbort(): Promise<never> {
  unavailable("Typst compile");
}

export const productionValidatorService = {
  async validateEpub(): Promise<never> {
    unavailable("EPUBCheck");
  },
};

export async function writeTempEpubAndValidate(): Promise<never> {
  unavailable("EPUBCheck temp validation");
}
