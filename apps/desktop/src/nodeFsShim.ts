// SPDX-License-Identifier: Apache-2.0
/**
 * Browser/Tauri shim for `node:fs` sync APIs used by host modules.
 * Import succeeds; calls fail closed in the webview.
 */
function unavailable(name: string): never {
  throw new Error(
    `${name} is not available in the desktop webview (Node filesystem host required).`,
  );
}

export function existsSync(..._args: unknown[]): never {
  unavailable("node:fs.existsSync");
}

export function mkdirSync(..._args: unknown[]): never {
  unavailable("node:fs.mkdirSync");
}

export function readFileSync(..._args: unknown[]): never {
  unavailable("node:fs.readFileSync");
}

export function writeFileSync(..._args: unknown[]): never {
  unavailable("node:fs.writeFileSync");
}

export function rmSync(..._args: unknown[]): never {
  unavailable("node:fs.rmSync");
}

export function readdirSync(..._args: unknown[]): never {
  unavailable("node:fs.readdirSync");
}

export function statSync(..._args: unknown[]): never {
  unavailable("node:fs.statSync");
}

export function renameSync(..._args: unknown[]): never {
  unavailable("node:fs.renameSync");
}

export default {
  existsSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
  rmSync,
  readdirSync,
  statSync,
  renameSync,
};
