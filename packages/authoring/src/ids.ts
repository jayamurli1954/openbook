// SPDX-License-Identifier: Apache-2.0
import { createHash } from "node:crypto";

/**
 * Deterministic ID factory for authoring mutations (ADR-0016 §2.1).
 * Format intentionally unfrozen; identical seed + sequence ⇒ identical IDs.
 */
export class DeterministicIdFactory {
  readonly #prefix: string;
  #section = 0;
  #block = 0;

  constructor(seedMaterial: string) {
    const digest = createHash("sha256").update(seedMaterial, "utf8").digest("hex");
    this.#prefix = `auth-${digest.slice(0, 12)}`;
  }

  nextSectionId(): string {
    this.#section += 1;
    return `${this.#prefix}-s${String(this.#section).padStart(4, "0")}`;
  }

  nextBlockId(): string {
    this.#block += 1;
    return `${this.#prefix}-b${String(this.#block).padStart(4, "0")}`;
  }
}
