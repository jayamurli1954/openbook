// SPDX-License-Identifier: Apache-2.0
import { createHash } from "node:crypto";

/**
 * Deterministic, unique ID factory for imported Books (ADR-0015 §2.1).
 * Format is intentionally unfrozen; only repeatability + uniqueness are required.
 */
export class DeterministicIdFactory {
  readonly #prefix: string;
  #section = 0;
  #block = 0;

  constructor(seedMaterial: string) {
    const digest = createHash("sha256").update(seedMaterial, "utf8").digest("hex");
    this.#prefix = `imp-${digest.slice(0, 12)}`;
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
