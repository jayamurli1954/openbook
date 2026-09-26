// SPDX-License-Identifier: Apache-2.0
/**
 * Browser/Tauri shim for `node:fs/promises`.
 * Lets Node-backed persistence modules load in the webview without crashing
 * at import time. Calls fail closed — real FS belongs in a Tauri/Node host.
 */
function unavailable(name: string): never {
  throw new Error(
    `${name} is not available in the desktop webview (Node filesystem host required).`,
  );
}

export async function access(..._args: unknown[]): Promise<never> {
  unavailable("node:fs/promises.access");
}

export async function mkdir(..._args: unknown[]): Promise<never> {
  unavailable("node:fs/promises.mkdir");
}

export async function readdir(..._args: unknown[]): Promise<never> {
  unavailable("node:fs/promises.readdir");
}

export async function readFile(..._args: unknown[]): Promise<never> {
  unavailable("node:fs/promises.readFile");
}

export async function rename(..._args: unknown[]): Promise<never> {
  unavailable("node:fs/promises.rename");
}

export async function rm(..._args: unknown[]): Promise<never> {
  unavailable("node:fs/promises.rm");
}

export async function stat(..._args: unknown[]): Promise<never> {
  unavailable("node:fs/promises.stat");
}

export async function writeFile(..._args: unknown[]): Promise<never> {
  unavailable("node:fs/promises.writeFile");
}

export async function mkdtemp(..._args: unknown[]): Promise<never> {
  unavailable("node:fs/promises.mkdtemp");
}
