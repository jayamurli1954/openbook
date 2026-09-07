// SPDX-License-Identifier: Apache-2.0
/**
 * SQLite driver abstraction for OpenBook desktop.
 *
 * Provides a clean boundary between persistence operations and the underlying SQLite engine:
 * - TauriPluginSqlConnection: Wraps @tauri-apps/plugin-sql in Tauri desktop runtime.
 * - InMemorySqliteConnection: Self-contained in-memory driver for unit tests (zero Node SQLite dependency).
 */
import Database from "@tauri-apps/plugin-sql";

/** Execution result from execute queries. */
export interface QueryExecutionResult {
  rowsAffected?: number;
  lastInsertId?: number;
}

/**
 * Minimal abstraction for a SQLite connection.
 */
export interface SqliteConnection {
  execute(sql: string, params?: unknown[]): Promise<QueryExecutionResult>;
  select<T>(sql: string, params?: unknown[]): Promise<T[]>;
  close(): Promise<void>;
}

/**
 * Production SQLite connection delegating to Tauri's SQL plugin.
 */
export class TauriPluginSqlConnection implements SqliteConnection {
  private db: Database | null = null;
  private readonly dbPath: string;

  constructor(dbPath: string = "sqlite:openbook-projects.db") {
    this.dbPath = dbPath;
  }

  private async getDb(): Promise<Database> {
    if (!this.db) {
      this.db = await Database.load(this.dbPath);
    }
    return this.db;
  }

  async execute(sql: string, params?: unknown[]): Promise<QueryExecutionResult> {
    const db = await this.getDb();
    const res = await db.execute(sql, (params ?? []) as unknown[]);
    return { rowsAffected: res.rowsAffected, lastInsertId: res.lastInsertId };
  }

  async select<T>(sql: string, params?: unknown[]): Promise<T[]> {
    const db = await this.getDb();
    return db.select<T[]>(sql, (params ?? []) as unknown[]);
  }

  async close(): Promise<void> {
    if (this.db) {
      await this.db.close();
      this.db = null;
    }
  }
}

/**
 * In-memory test connection for unit testing.
 * Implements the minimal SQL subset needed by OpenBook project persistence:
 * - schema_migrations, projects, and project_documents tables
 * - INSERT / UPDATE / SELECT / DELETE
 * - Cascade deletion on project_documents
 * - Parameter substitution (?)
 *
 * Avoids any dependency on experimental node:sqlite or native modules.
 */
export class InMemorySqliteConnection implements SqliteConnection {
  private isClosed = false;

  // In-memory table stores
  public migrations: Array<{ version: number; applied_at: string }> = [];
  public projects = new Map<
    string,
    {
      id: string;
      name: string;
      created_at: string;
      updated_at: string;
      schema_version: number;
    }
  >();
  public projectDocuments = new Map<
    string,
    {
      project_id: string;
      book_payload: string;
      book_schema_version: number;
      updated_at: string;
    }
  >();

  private assertOpen(): void {
    if (this.isClosed) {
      throw new Error("Database connection is closed.");
    }
  }

  async execute(sql: string, params: unknown[] = []): Promise<QueryExecutionResult> {
    this.assertOpen();
    const normalized = sql.trim().replace(/\s+/g, " ");

    if (normalized.toUpperCase().startsWith("CREATE TABLE")) {
      // Table definitions are recorded by existence of tables
      return { rowsAffected: 0 };
    }

    if (normalized.toUpperCase().startsWith("INSERT INTO SCHEMA_MIGRATIONS")) {
      const version = params[0] as number;
      const appliedAt = params[1] as string;
      if (!this.migrations.some((m) => m.version === version)) {
        this.migrations.push({ version, applied_at: appliedAt });
      }
      return { rowsAffected: 1 };
    }

    if (normalized.toUpperCase().startsWith("INSERT INTO PROJECTS")) {
      const [id, name, createdAt, updatedAt, schemaVersion] = params as [
        string,
        string,
        string,
        string,
        number,
      ];
      this.projects.set(id, {
        id,
        name,
        created_at: createdAt,
        updated_at: updatedAt,
        schema_version: schemaVersion,
      });
      return { rowsAffected: 1 };
    }

    if (normalized.toUpperCase().startsWith("INSERT INTO PROJECT_DOCUMENTS")) {
      const [projectId, bookPayload, bookSchemaVersion, updatedAt] = params as [
        string,
        string,
        number,
        string,
      ];
      this.projectDocuments.set(projectId, {
        project_id: projectId,
        book_payload: bookPayload,
        book_schema_version: bookSchemaVersion,
        updated_at: updatedAt,
      });
      return { rowsAffected: 1 };
    }

    if (normalized.toUpperCase().startsWith("DELETE FROM PROJECTS")) {
      const id = params[0] as string;
      const existed = this.projects.delete(id);
      if (existed) {
        // Cascade delete
        this.projectDocuments.delete(id);
        return { rowsAffected: 1 };
      }
      return { rowsAffected: 0 };
    }

    throw new Error(`Unsupported query execution in InMemorySqliteConnection: ${sql}`);
  }

  async select<T>(sql: string, params: unknown[] = []): Promise<T[]> {
    this.assertOpen();
    const normalized = sql.trim().replace(/\s+/g, " ");

    if (normalized.toUpperCase().includes("FROM SCHEMA_MIGRATIONS")) {
      return [...this.migrations] as unknown as T[];
    }

    if (normalized.toUpperCase().includes("FROM PROJECT_DOCUMENTS") && normalized.toUpperCase().includes("WHERE PROJECT_ID")) {
      const projectId = params[0] as string;
      const doc = this.projectDocuments.get(projectId);
      return doc ? ([doc] as unknown as T[]) : [];
    }

    if (normalized.toUpperCase().includes("FROM PROJECTS") && normalized.toUpperCase().includes("WHERE ID")) {
      const id = params[0] as string;
      const proj = this.projects.get(id);
      return proj ? ([proj] as unknown as T[]) : [];
    }

    if (normalized.toUpperCase().includes("FROM PROJECTS") && normalized.toUpperCase().includes("ORDER BY")) {
      const list = Array.from(this.projects.values()).sort((a, b) =>
        b.updated_at.localeCompare(a.updated_at),
      );
      return list as unknown as T[];
    }

    throw new Error(`Unsupported select query in InMemorySqliteConnection: ${sql}`);
  }

  async close(): Promise<void> {
    this.isClosed = true;
  }
}
