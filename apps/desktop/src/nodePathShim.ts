// SPDX-License-Identifier: Apache-2.0
/**
 * Minimal POSIX-like `node:path` shim for the Tauri webview.
 * Enough for path.join/resolve used while constructing store paths;
 * real filesystem IO remains hosted outside the renderer.
 */
function normalize(input: string): string {
  const replaced = input.replace(/\\/g, "/");
  const parts: string[] = [];
  for (const part of replaced.split("/")) {
    if (!part || part === ".") continue;
    if (part === "..") {
      parts.pop();
      continue;
    }
    parts.push(part);
  }
  const joined = parts.join("/");
  return replaced.startsWith("/") ? `/${joined}` : joined;
}

export function join(...parts: string[]): string {
  return normalize(parts.filter((p) => p.length > 0).join("/"));
}

export function resolve(...parts: string[]): string {
  return normalize(parts.filter((p) => p.length > 0).join("/"));
}

export function dirname(p: string): string {
  const normalized = normalize(p);
  const idx = normalized.lastIndexOf("/");
  if (idx <= 0) return normalized.startsWith("/") ? "/" : ".";
  return normalized.slice(0, idx) || "/";
}

export function basename(p: string, ext?: string): string {
  const normalized = normalize(p);
  const base = normalized.slice(normalized.lastIndexOf("/") + 1);
  if (ext && base.endsWith(ext)) return base.slice(0, -ext.length);
  return base;
}

export function extname(p: string): string {
  const base = basename(p);
  const idx = base.lastIndexOf(".");
  return idx > 0 ? base.slice(idx) : "";
}

export function isAbsolute(p: string): boolean {
  return /^(?:[a-zA-Z]:)?[\\/]/.test(p) || p.startsWith("/");
}

const pathApi = {
  join,
  resolve,
  dirname,
  basename,
  extname,
  isAbsolute,
  sep: "/",
  delimiter: ";",
};

export default pathApi;
