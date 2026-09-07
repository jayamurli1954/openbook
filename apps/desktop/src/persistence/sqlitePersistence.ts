// SPDX-License-Identifier: Apache-2.0
/**
 * SQLite-backed implementation of OpenBook ProjectPersistence.
 *
 * ARCHITECTURAL RULES:
 * - SQLite is persistence infrastructure, not the domain model.
 * - Operates on ProjectPersistence DTOs and canonical Book Model.
 * - Never leaks SQLite or database types to Book or SemanticDocument.
 * - Minimal three-table schema (schema_migrations, projects, project_documents).
 * - Preserves Unicode text semantics faithfully.
 */
import {
  deserializeProjectFromDto,
  serializeProjectToDto,
  validateProjectId,
  type PersistenceEnvelopeDto,
  type ProjectDocumentDto,
  type ProjectRecordDto,
} from "./dto.js";
import {
  type SqliteConnection,
  TauriPluginSqlConnection,
} from "./sqliteDriver.js";
import {
  PERSISTENCE_SCHEMA_VERSION,
  type OpenBookProject,
  type PersistenceResult,
  type ProjectPersistence,
  type ProjectPersistenceMetadata,
  type ProjectSummary,
  type SaveSummary,
} from "./types.js";

const DDL_MIGRATIONS = `
CREATE TABLE IF NOT EXISTS schema_migrations (
  version INTEGER PRIMARY KEY,
  applied_at TEXT NOT NULL
);
`;

const DDL_PROJECTS = `
CREATE TABLE IF NOT EXISTS projects (
  id TEXT PRIMARY KEY NOT NULL,
  name TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  schema_version INTEGER NOT NULL
);
`;

const DDL_PROJECT_DOCUMENTS = `
CREATE TABLE IF NOT EXISTS project_documents (
  project_id TEXT PRIMARY KEY NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  book_payload TEXT NOT NULL,
  book_schema_version INTEGER NOT NULL,
  updated_at TEXT NOT NULL
);
`;

export class SqliteProjectPersistence implements ProjectPersistence {
  private readonly connection: SqliteConnection;
  private isInitialized = false;

  constructor(connection?: SqliteConnection) {
    this.connection = connection ?? new TauriPluginSqlConnection();
  }

  /**
   * Initialize database tables and record migration.
   */
  async initialize(): Promise<PersistenceResult<void>> {
    try {
      await this.connection.execute(DDL_MIGRATIONS);
      await this.connection.execute(DDL_PROJECTS);
      await this.connection.execute(DDL_PROJECT_DOCUMENTS);

      const existing = await this.connection.select<{ version: number }>(
        "SELECT version FROM schema_migrations WHERE version = ?",
        [PERSISTENCE_SCHEMA_VERSION],
      );

      if (existing.length === 0) {
        await this.connection.execute(
          "INSERT INTO schema_migrations (version, applied_at) VALUES (?, ?)",
          [PERSISTENCE_SCHEMA_VERSION, new Date().toISOString()],
        );
      }

      this.isInitialized = true;
      return { ok: true, value: undefined };
    } catch (err) {
      return {
        ok: false,
        error: {
          code: "DATABASE_ERROR",
          message: `Failed to initialize SQLite persistence schema: ${err instanceof Error ? err.message : String(err)}`,
        },
      };
    }
  }

  private async ensureInitialized(): Promise<PersistenceResult<void>> {
    if (!this.isInitialized) {
      return this.initialize();
    }
    return { ok: true, value: undefined };
  }

  /**
   * Save (insert or update) an OpenBook project.
   */
  async saveProject(project: OpenBookProject): Promise<PersistenceResult<SaveSummary>> {
    const initRes = await this.ensureInitialized();
    if (!initRes.ok) return initRes;

    const serializeRes = serializeProjectToDto(project);
    if (!serializeRes.ok) {
      return serializeRes;
    }

    const { project: pRecord, document: dRecord } = serializeRes.value;

    try {
      // Upsert project row
      await this.connection.execute(
        `INSERT INTO projects (id, name, created_at, updated_at, schema_version)
         VALUES (?, ?, ?, ?, ?)
         ON CONFLICT(id) DO UPDATE SET
           name = excluded.name,
           updated_at = excluded.updated_at,
           schema_version = excluded.schema_version`,
        [pRecord.id, pRecord.name, pRecord.created_at, pRecord.updated_at, pRecord.schema_version],
      );

      // Upsert document row
      await this.connection.execute(
        `INSERT INTO project_documents (project_id, book_payload, book_schema_version, updated_at)
         VALUES (?, ?, ?, ?)
         ON CONFLICT(project_id) DO UPDATE SET
           book_payload = excluded.book_payload,
           book_schema_version = excluded.book_schema_version,
           updated_at = excluded.updated_at`,
        [dRecord.project_id, dRecord.book_payload, dRecord.book_schema_version, dRecord.updated_at],
      );

      return {
        ok: true,
        value: {
          projectId: pRecord.id,
          updatedAt: pRecord.updated_at,
        },
      };
    } catch (err) {
      return {
        ok: false,
        error: {
          code: "DATABASE_ERROR",
          message: `Failed to save project ${pRecord.id}: ${err instanceof Error ? err.message : String(err)}`,
        },
      };
    }
  }

  /**
   * Load an OpenBook project by ID.
   */
  async loadProject(projectId: string): Promise<PersistenceResult<OpenBookProject>> {
    const initRes = await this.ensureInitialized();
    if (!initRes.ok) return initRes;

    const idVal = validateProjectId(projectId);
    if (!idVal.ok) return idVal;
    const validId = idVal.value;

    try {
      const projectRows = await this.connection.select<ProjectRecordDto>(
        "SELECT id, name, created_at, updated_at, schema_version FROM projects WHERE id = ?",
        [validId],
      );

      if (projectRows.length === 0 || !projectRows[0]) {
        return {
          ok: false,
          error: {
            code: "NOT_FOUND",
            message: `Project "${validId}" not found.`,
          },
        };
      }
      const projectRecord = projectRows[0];

      const documentRows = await this.connection.select<ProjectDocumentDto>(
        "SELECT project_id, book_payload, book_schema_version, updated_at FROM project_documents WHERE project_id = ?",
        [validId],
      );

      if (documentRows.length === 0 || !documentRows[0]) {
        return {
          ok: false,
          error: {
            code: "CORRUPT_DATA",
            message: `Document content missing for project "${validId}".`,
          },
        };
      }
      const documentRecord = documentRows[0];

      const envelope: PersistenceEnvelopeDto = {
        project: projectRecord,
        document: documentRecord,
      };

      return deserializeProjectFromDto(envelope);
    } catch (err) {
      return {
        ok: false,
        error: {
          code: "DATABASE_ERROR",
          message: `Failed to load project "${validId}": ${err instanceof Error ? err.message : String(err)}`,
        },
      };
    }
  }

  /**
   * Get metadata only for a project by ID.
   */
  async getProjectMetadata(
    projectId: string,
  ): Promise<PersistenceResult<ProjectPersistenceMetadata>> {
    const initRes = await this.ensureInitialized();
    if (!initRes.ok) return initRes;

    const idVal = validateProjectId(projectId);
    if (!idVal.ok) return idVal;
    const validId = idVal.value;

    try {
      const projectRows = await this.connection.select<ProjectRecordDto>(
        "SELECT id, name, created_at, updated_at, schema_version FROM projects WHERE id = ?",
        [validId],
      );

      if (projectRows.length === 0 || !projectRows[0]) {
        return {
          ok: false,
          error: {
            code: "NOT_FOUND",
            message: `Project "${validId}" not found.`,
          },
        };
      }
      const p = projectRows[0];

      const docRows = await this.connection.select<{ book_schema_version: number }>(
        "SELECT book_schema_version FROM project_documents WHERE project_id = ?",
        [validId],
      );

      const bookSchemaVersion = docRows[0]?.book_schema_version ?? 1;

      return {
        ok: true,
        value: {
          id: p.id,
          name: p.name,
          createdAt: p.created_at,
          updatedAt: p.updated_at,
          schemaVersion: p.schema_version,
          bookSchemaVersion,
        },
      };
    } catch (err) {
      return {
        ok: false,
        error: {
          code: "DATABASE_ERROR",
          message: `Failed to fetch metadata for project "${validId}": ${err instanceof Error ? err.message : String(err)}`,
        },
      };
    }
  }

  /**
   * List all stored projects sorted by updated_at descending.
   */
  async listProjects(): Promise<PersistenceResult<ProjectSummary[]>> {
    const initRes = await this.ensureInitialized();
    if (!initRes.ok) return initRes;

    try {
      const rows = await this.connection.select<ProjectRecordDto>(
        "SELECT id, name, created_at, updated_at, schema_version FROM projects ORDER BY updated_at DESC",
      );

      const summaries: ProjectSummary[] = rows.map((r) => ({
        id: r.id,
        name: r.name,
        updatedAt: r.updated_at,
        schemaVersion: r.schema_version,
      }));

      return { ok: true, value: summaries };
    } catch (err) {
      return {
        ok: false,
        error: {
          code: "DATABASE_ERROR",
          message: `Failed to list projects: ${err instanceof Error ? err.message : String(err)}`,
        },
      };
    }
  }

  /**
   * Delete a project and its documents by ID.
   */
  async deleteProject(projectId: string): Promise<PersistenceResult<void>> {
    const initRes = await this.ensureInitialized();
    if (!initRes.ok) return initRes;

    const idVal = validateProjectId(projectId);
    if (!idVal.ok) return idVal;
    const validId = idVal.value;

    try {
      const res = await this.connection.execute(
        "DELETE FROM projects WHERE id = ?",
        [validId],
      );

      if (res.rowsAffected === 0) {
        return {
          ok: false,
          error: {
            code: "NOT_FOUND",
            message: `Project "${validId}" does not exist.`,
          },
        };
      }

      return { ok: true, value: undefined };
    } catch (err) {
      return {
        ok: false,
        error: {
          code: "DATABASE_ERROR",
          message: `Failed to delete project "${validId}": ${err instanceof Error ? err.message : String(err)}`,
        },
      };
    }
  }

  /**
   * Close the connection.
   */
  async close(): Promise<PersistenceResult<void>> {
    try {
      await this.connection.close();
      this.isInitialized = false;
      return { ok: true, value: undefined };
    } catch (err) {
      return {
        ok: false,
        error: {
          code: "DATABASE_ERROR",
          message: `Failed to close database: ${err instanceof Error ? err.message : String(err)}`,
        },
      };
    }
  }
}
