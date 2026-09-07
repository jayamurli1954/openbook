// SPDX-License-Identifier: Apache-2.0

const FALLBACK_DETERMINISTIC_DATE = "2026-01-01T00:00:00Z";

/**
 * Normalizes a Date or ISO date string so that its local-time getters
 * (`getFullYear()`, `getMonth()`, `getDate()`, `getHours()`, `getMinutes()`, `getSeconds()`)
 * return the exact UTC components of the intended timestamp.
 *
 * Why this is necessary:
 * `fflate` serializes MS-DOS ZIP timestamps using JavaScript's local-time getters
 * on the supplied `mtime` Date object. Passing a standard Date directly causes
 * `fflate` to emit different time bytes depending on the host machine's timezone
 * (e.g. UTC vs. Singapore vs. New York).
 *
 * By constructing a Date whose local-time components equal the intended UTC instant,
 * `fflate` emits identical MS-DOS time and date bytes regardless of the host timezone,
 * guaranteeing cross-machine, cross-timezone byte-for-byte determinism.
 */
export function normalizeDateForZip(input?: string | Date): Date {
  let utcDate: Date;

  if (input instanceof Date) {
    utcDate = input;
  } else if (typeof input === "string" && input.trim().length > 0) {
    const parsed = new Date(input.trim());
    utcDate = Number.isNaN(parsed.getTime())
      ? new Date(FALLBACK_DETERMINISTIC_DATE)
      : parsed;
  } else {
    utcDate = new Date(FALLBACK_DETERMINISTIC_DATE);
  }

  return new Date(
    utcDate.getUTCFullYear(),
    utcDate.getUTCMonth(),
    utcDate.getUTCDate(),
    utcDate.getUTCHours(),
    utcDate.getUTCMinutes(),
    utcDate.getUTCSeconds(),
  );
}
