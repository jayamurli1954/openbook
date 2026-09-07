/**
 * SQLite connectivity proof only (ADR-0007 §6).
 *
 * Opens a temporary smoke database, runs `SELECT 1`, and closes the connection.
 * Must NOT introduce production schema, migrations, or a domain database model.
 * Book Model remains canonical in `@openbook/book-model`.
 *
 * Cleanup note: `tauri-plugin-sql` exposes load/select/execute/close only — it does
 * not delete the on-disk file. `openbook-shell-smoke.db` is therefore a *temporary
 * smoke database* under the app data directory (relative to Tauri `BaseDirectory::App`).
 * It is safe to leave or remove manually; it is not an OpenBook project database and
 * must not be treated as production persistence.
 */
import Database from "@tauri-apps/plugin-sql";

/** Temporary smoke DB filename — not an OpenBook project database. */
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
