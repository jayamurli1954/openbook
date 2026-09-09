// SPDX-License-Identifier: Apache-2.0
import { mkdir, readdir, readFile, rename, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { assertSha256Key, type IAssetStore } from "./store.js";

/**
 * Directory-backed CAS store (ADR-0017).
 * Layout: `{rootDir}/{sha256}` — keys are hex digests only.
 * `originalFilename` is never consulted for paths.
 */
export class DirectoryAssetStore implements IAssetStore {
  readonly #rootDir: string;

  constructor(rootDir: string) {
    this.#rootDir = path.resolve(rootDir);
  }

  #pathFor(sha256: string): string {
    const key = assertSha256Key(sha256);
    // Storage location is derived solely from the validated hex digest.
    return path.join(this.#rootDir, key);
  }

  async put(sha256: string, content: Uint8Array): Promise<void> {
    const key = assertSha256Key(sha256);
    await mkdir(this.#rootDir, { recursive: true });
    const target = this.#pathFor(key);
    const temp = path.join(
      this.#rootDir,
      `.tmp-${key}-${process.pid}-${Date.now()}`,
    );
    await writeFile(temp, content);
    try {
      await rename(temp, target);
    } catch {
      // Windows may refuse rename-over-existing; replace explicitly.
      await rm(target, { force: true });
      await rename(temp, target);
    }
  }

  async get(sha256: string): Promise<Uint8Array | undefined> {
    const key = assertSha256Key(sha256);
    try {
      const buf = await readFile(this.#pathFor(key));
      return new Uint8Array(buf);
    } catch (err: unknown) {
      if (err && typeof err === "object" && "code" in err && err.code === "ENOENT") {
        return undefined;
      }
      throw err;
    }
  }

  async has(sha256: string): Promise<boolean> {
    return (await this.get(sha256)) !== undefined;
  }

  async delete(sha256: string): Promise<boolean> {
    const key = assertSha256Key(sha256);
    try {
      await rm(this.#pathFor(key));
      return true;
    } catch (err: unknown) {
      if (err && typeof err === "object" && "code" in err && err.code === "ENOENT") {
        return false;
      }
      throw err;
    }
  }

  async listHashes(): Promise<string[]> {
    try {
      const entries = await readdir(this.#rootDir);
      return entries
        .filter((name) => /^[a-f0-9]{64}$/i.test(name) && !name.startsWith("."))
        .map((name) => name.toLowerCase())
        .sort();
    } catch (err: unknown) {
      if (err && typeof err === "object" && "code" in err && err.code === "ENOENT") {
        return [];
      }
      throw err;
    }
  }
}
