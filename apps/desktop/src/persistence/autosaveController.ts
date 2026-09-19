// SPDX-License-Identifier: Apache-2.0
/**
 * ADR-0031 Slice 1: autosave dirty/debounce/coalesce controller.
 *
 * Schedules saves through an injected port. Does not touch the filesystem,
 * React, Tauri, or DesktopStudioCoordinator.
 */
export interface AutosaveError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
}

export type AutosaveSaveResult =
  | { ok: true }
  | { ok: false; error: AutosaveError };

export interface AutosaveSavePort {
  save(): Promise<AutosaveSaveResult>;
}

export interface AutosaveClock {
  setTimeout(handler: () => void, ms: number): unknown;
  clearTimeout(id: unknown): void;
}

export interface AutosaveControllerOptions {
  debounceMs: number;
  save: AutosaveSavePort;
  clock?: AutosaveClock;
}

export type AutosaveStatus =
  | { state: "idle"; dirty: false }
  | { state: "dirty"; dirty: true }
  | { state: "scheduled"; dirty: true }
  | { state: "saving"; dirty: true }
  | { state: "error"; dirty: boolean; error: AutosaveError };

const defaultClock: AutosaveClock = {
  setTimeout: (handler, ms) => globalThis.setTimeout(handler, ms),
  clearTimeout: (id) => globalThis.clearTimeout(id as ReturnType<typeof setTimeout>),
};

/**
 * Debounced autosave scheduler over an injected Save port.
 * Callers mark dirty after canonical Book mutations; this controller never
 * inspects Tiptap JSON.
 */
export class AutosaveController {
  readonly #debounceMs: number;
  readonly #save: AutosaveSavePort;
  readonly #clock: AutosaveClock;

  #dirty = false;
  #timer: unknown = undefined;
  #saving = false;
  #rescheduleAfterSave = false;
  #disposed = false;
  #lastError: AutosaveError | undefined;
  #statusListeners = new Set<(status: AutosaveStatus) => void>();

  constructor(options: AutosaveControllerOptions) {
    if (!Number.isFinite(options.debounceMs) || options.debounceMs < 0) {
      throw new Error("debounceMs must be a non-negative finite number.");
    }
    this.#debounceMs = options.debounceMs;
    this.#save = options.save;
    this.#clock = options.clock ?? defaultClock;
  }

  isDirty(): boolean {
    return this.#dirty;
  }

  getStatus(): AutosaveStatus {
    if (this.#lastError) {
      return { state: "error", dirty: this.#dirty, error: this.#lastError };
    }
    if (this.#saving) return { state: "saving", dirty: true };
    if (this.#timer !== undefined) return { state: "scheduled", dirty: true };
    if (this.#dirty) return { state: "dirty", dirty: true };
    return { state: "idle", dirty: false };
  }

  onStatusChange(listener: (status: AutosaveStatus) => void): () => void {
    this.#statusListeners.add(listener);
    return () => {
      this.#statusListeners.delete(listener);
    };
  }

  markDirty(): void {
    if (this.#disposed) return;
    this.#dirty = true;
    this.#lastError = undefined;
    if (this.#saving) {
      this.#rescheduleAfterSave = true;
      this.#emit();
      return;
    }
    this.#armTimer();
    this.#emit();
  }

  markClean(): void {
    if (this.#disposed) return;
    this.#dirty = false;
    this.#rescheduleAfterSave = false;
    this.#lastError = undefined;
    this.#clearTimer();
    this.#emit();
  }

  /** Immediately save if dirty (cancels pending debounce). */
  async flush(): Promise<AutosaveSaveResult> {
    if (this.#disposed) {
      return {
        ok: false,
        error: { code: "AUTOSAVE_DISPOSED", message: "AutosaveController is disposed." },
      };
    }
    this.#clearTimer();
    if (!this.#dirty) return { ok: true };
    return this.#runSave();
  }

  dispose(): void {
    this.#disposed = true;
    this.#clearTimer();
    this.#statusListeners.clear();
  }

  #armTimer(): void {
    this.#clearTimer();
    this.#timer = this.#clock.setTimeout(() => {
      this.#timer = undefined;
      void this.#runSave();
    }, this.#debounceMs);
  }

  #clearTimer(): void {
    if (this.#timer !== undefined) {
      this.#clock.clearTimeout(this.#timer);
      this.#timer = undefined;
    }
  }

  async #runSave(): Promise<AutosaveSaveResult> {
    if (this.#disposed) {
      return {
        ok: false,
        error: { code: "AUTOSAVE_DISPOSED", message: "AutosaveController is disposed." },
      };
    }
    if (this.#saving) {
      this.#rescheduleAfterSave = true;
      return {
        ok: false,
        error: {
          code: "AUTOSAVE_IN_FLIGHT",
          message: "An autosave is already in progress; a follow-up was scheduled.",
        },
      };
    }
    if (!this.#dirty) return { ok: true };

    this.#saving = true;
    this.#lastError = undefined;
    this.#emit();

    let result: AutosaveSaveResult;
    try {
      result = await this.#save.save();
    } catch (err: unknown) {
      result = {
        ok: false,
        error: {
          code: "AUTOSAVE_THROWN",
          message: err instanceof Error ? err.message : String(err),
        },
      };
    }

    this.#saving = false;

    if (result.ok) {
      this.#dirty = false;
      this.#lastError = undefined;
      if (this.#rescheduleAfterSave) {
        this.#rescheduleAfterSave = false;
        this.#dirty = true;
        this.#armTimer();
      }
    } else {
      this.#lastError = result.error;
      // Remain dirty so the caller can retry / flush.
      this.#rescheduleAfterSave = false;
    }

    this.#emit();
    return result;
  }

  #emit(): void {
    const status = this.getStatus();
    for (const listener of this.#statusListeners) {
      listener(status);
    }
  }
}
