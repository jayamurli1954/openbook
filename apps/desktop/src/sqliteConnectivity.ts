/**
 * SQLite connectivity proof only (ADR-0007 §6).
 *
 * Opens a throwaway DB file, runs `SELECT 1`, and closes.
 * Must NOT introduce production schema, migrations, or a domain database model.
 * Book Model remains canonical in `@openbook/book-model`.
 */
import Database from "@tauri-apps/plugin-sql";

/** Ephemeral smoke DB name — not an OpenBook project database. */
const SMOKE_DB = "sqlite:openbook-shell-smoke.db";

export type SqliteConnectivityResult =
  | { ok: true; one: number }
  | { ok: false; error: string };

export async function proveSqliteConnectivity(): Promise<SqliteConnectivityResult> {
  let db: Database | undefined;
  try {
    db = await Database.load(SMOKE_DB);
    const rows = await db.select<{ one: number }[]>("SELECT 1 AS one");
    const one = rows[0]?.one;
    if (one !== 1) {
      return { ok: false, error: `unexpected SELECT 1 result: ${JSON.stringify(rows)}` };
    }
    return { ok: true, one };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return { ok: false, error: message };
  } finally {
    if (db) {
      try {
        await db.close();
      } catch {
        // ignore close errors after a failed proof
      }
    }
  }
}
