# OpenBook Project Persistence Architecture

- **Status:** Architecture established (PR #16)
- **Date:** 2026-09-07
- **Area:** Desktop Shell / Local Persistence Boundary

---

## 1. Objective & Scope

This document defines the persistence architecture and contracts for OpenBook projects using the approved SQLite desktop foundation (ADR-0007).

PR #16 establishes the **persistence boundary only**. It does **not** implement Save/Open UI, automatic autosave, or file import/export.

---

## 2. Layer Hierarchy & Architectural Flow

```text
Tiptap (WebView)
  ↓ (editor transport JSON)
EditorAdapter (apps/desktop/src/domain/editorAdapter.ts)
  ↓ (structured document contract)
SemanticDocument (@openbook/semantic-document)
  ↓ (in-memory domain projection)
Book Model (@openbook/book-model) — CANONICAL SOURCE OF TRUTH
  ↓ (serializeProjectToDto)
ProjectPersistence DTOs (apps/desktop/src/persistence/dto.ts)
  ↓ (ProjectPersistence interface)
SQLite Adapter (apps/desktop/src/persistence/sqlitePersistence.ts)
  ↓ (SqliteConnection driver abstraction)
tauri-plugin-sql (production) | InMemorySqliteConnection (unit tests)
```

---

## 3. Data Ownership Principles

1. **The Book Model remains canonical:** The publication data model is `@openbook/book-model`. It defines authoring semantics, structure, assets, styles, typography, and publishing settings.
2. **`OpenBookProject` is an application/persistence aggregate:** It is **not** a second canonical domain model. It packages project container metadata (`id`, `name`, `createdAt`, `updatedAt`, `schemaVersion`, `bookSchemaVersion`) alongside the canonical `Book`.
3. **SQLite is persistence infrastructure, not the domain model:** SQLite stores project metadata and serialized Book Model payloads. It does not dictate domain rules or publishing semantics.
4. **Tiptap JSON must NOT become the persistence model:** Editor transport stays at the editor surface. Persistence operates strictly against the canonical Book Model.
5. **No EPUB packaging leaks:** EPUB packaging fields (`opf`, `manifest`, `spine`, `ncx`, `nav`, `navDoc`, `container`, `packageDocument`) are strictly rejected during serialization and deserialization. Publishing formats remain downstream projections.
6. **No SQLite type leaks:** Neither `@openbook/book-model` nor `@openbook/semantic-document` import or reference SQLite types, DTOs, or drivers.

---

## 4. Minimal SQLite Persistence Schema

In accordance with minimal foundation requirements, exactly three tables are defined:

```sql
-- Schema migration tracking
CREATE TABLE IF NOT EXISTS schema_migrations (
  version INTEGER PRIMARY KEY,
  applied_at TEXT NOT NULL
);

-- Project container identity & metadata
CREATE TABLE IF NOT EXISTS projects (
  id TEXT PRIMARY KEY NOT NULL,
  name TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  schema_version INTEGER NOT NULL
);

-- Canonical project document payload
CREATE TABLE IF NOT EXISTS project_documents (
  project_id TEXT PRIMARY KEY NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  book_payload TEXT NOT NULL,
  book_schema_version INTEGER NOT NULL,
  updated_at TEXT NOT NULL
);
```

### Deliberate Omissions (Explicit Non-Goals)
The schema deliberately omits tables for:
- EPUB, PDF, HTML publishing output artifacts
- DTP page layout and typesetting tables
- Validation reports and EPUBCheck outputs
- Book Doctor state
- AI/Ollama models or prompts
- Assets / media binary blobs
- Collaboration, sync, or user accounts

---

## 5. Driver Abstraction & Testing Boundary

Persistence operations interact with SQLite through the `SqliteConnection` interface:

```typescript
export interface SqliteConnection {
  execute(sql: string, params?: unknown[]): Promise<QueryExecutionResult>;
  select<T>(sql: string, params?: unknown[]): Promise<T[]>;
  transaction<T>(action: (conn: SqliteConnection) => Promise<T>): Promise<T>;
  close(): Promise<void>;
}
```

- **Atomic Transactions:** `saveProject()` executes project row and document row upserts atomically within `connection.transaction()`. If any operation fails, state is rolled back completely to prevent orphan or partial project records.
- **Foreign-Key Enforcement:** SQLite foreign keys are connection-level and explicitly enabled via `PRAGMA foreign_keys = ON;` in `TauriPluginSqlConnection` and during `SqliteProjectPersistence.initialize()`. The test driver (`InMemorySqliteConnection`) explicitly models and enforces foreign key constraints and cascade deletion.
- **Integrity Validation:** `getProjectMetadata()` strictly requires the corresponding `project_documents` row; if absent, it returns `CORRUPT_DATA` rather than silently defaulting `bookSchemaVersion`.
- **Production Driver:** `TauriPluginSqlConnection` delegates to `tauri-plugin-sql` (`Database.load(...)`) within Tauri's native desktop runtime.
- **Unit Tests:** `InMemorySqliteConnection` provides a self-contained in-memory SQL driver with snapshot/rollback transactions and foreign key constraint enforcement. This completely avoids coupling tests to Node's experimental `node:sqlite` or requiring running Tauri IPC in Node.

---

## 6. Unicode Preservation Guarantee

The persistence layer guarantees semantic Unicode code-point preservation:
- All text strings (including complex Indic scripts such as Kannada: combining characters, halant clusters, and conjuncts like `ಕನ್ನಡ`, `ಕೃಷಿ`, `ಸ್ವಾತಂತ್ರ್ಯ`) are preserved with exact code point equality across serialization, storage, and deserialization.
- Verified by unit tests comparing code points of original and deserialized content.

---

## 7. Current Limitations & Next Steps

1. **No Save/Open UI:** Project saving and loading are headless contracts; UI integration belongs to a future PR.
2. **Single Document per Project:** Current schema persists one canonical Book document per project. Multi-volume or modular project support can be accommodated in future schema revisions.
3. **In-Database Book Payload:** Book Model payloads are stored as serialized JSON in `project_documents.book_payload`. Binary asset storage and large media decoupling belong to a later asset management milestone.
