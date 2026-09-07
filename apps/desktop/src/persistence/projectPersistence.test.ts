// SPDX-License-Identifier: Apache-2.0
/**
 * Unit tests for OpenBook SQLite project persistence architecture (PR #16).
 *
 * Covers:
 * - create/serialize a persistence representation
 * - deserialize back without semantic loss
 * - English content
 * - Kannada content / semantic Unicode code-point preservation
 * - project identity handling and validation
 * - schema/version handling
 * - invalid persistence data rejection
 * - absence of EPUB packaging fields
 * - persistence boundary does not depend on Tiptap JSON
 * - SQLite infrastructure boundary operations (init, save, load, getMetadata, list, delete, cascade)
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { test } from "node:test";
import { BOOK_MODEL_SCHEMA_VERSION, type Book } from "@openbook/book-model";
import {
  createProjectId,
  deserializeProjectFromDto,
  serializeProjectToDto,
  validateProjectId,
  type PersistenceEnvelopeDto,
} from "./dto.js";
import { InMemorySqliteConnection } from "./sqliteDriver.js";
import { SqliteProjectPersistence } from "./sqlitePersistence.js";
import {
  PERSISTENCE_SCHEMA_VERSION,
  type OpenBookProject,
  type ProjectPersistenceMetadata,
} from "./types.js";

// Load test fixtures from repository root
const REPO_ROOT = join(import.meta.dirname, "../../..");
const englishBook: Book = JSON.parse(
  readFileSync(join(REPO_ROOT, "tests/fixtures/simple-english.json"), "utf-8"),
);
const kannadaBook: Book = JSON.parse(
  readFileSync(join(REPO_ROOT, "tests/fixtures/kannada-indic.json"), "utf-8"),
);

function makeProject(id: string, name: string, book: Book): OpenBookProject {
  const now = new Date().toISOString();
  const metadata: ProjectPersistenceMetadata = {
    id,
    name,
    createdAt: now,
    updatedAt: now,
    schemaVersion: PERSISTENCE_SCHEMA_VERSION,
    bookSchemaVersion: BOOK_MODEL_SCHEMA_VERSION,
  };
  return { metadata, book };
}

test("project identity: createProjectId generates valid IDs and validateProjectId enforces rules", () => {
  const id1 = createProjectId();
  assert.match(id1, /^proj-[a-f0-9-]{36}$/);

  const customId = createProjectId("mybook");
  assert.match(customId, /^mybook-[a-f0-9-]{36}$/);

  // Validation passes for valid IDs
  assert.equal(validateProjectId(id1).ok, true);
  assert.equal(validateProjectId("simple-id_123").ok, true);

  // Validation fails for invalid IDs
  assert.equal(validateProjectId("").ok, false);
  assert.equal(validateProjectId("   ").ok, false);
  assert.equal(validateProjectId(null).ok, false);
  assert.equal(validateProjectId("id with spaces").ok, false);
  assert.equal(validateProjectId("../traversal/id").ok, false);
  assert.equal(validateProjectId("ab").ok, false); // too short
});

test("English content: serialize to DTO and deserialize back without semantic loss", () => {
  const id = createProjectId("test");
  const project = makeProject(id, "English Novel Project", englishBook);

  const serializeRes = serializeProjectToDto(project);
  assert.equal(serializeRes.ok, true);
  if (!serializeRes.ok) return;

  const envelope = serializeRes.value;
  assert.equal(envelope.project.id, id);
  assert.equal(envelope.project.name, "English Novel Project");
  assert.equal(envelope.project.schema_version, 1);
  assert.equal(envelope.document.project_id, id);
  assert.equal(envelope.document.book_schema_version, 1);

  const deserializeRes = deserializeProjectFromDto(envelope);
  assert.equal(deserializeRes.ok, true);
  if (!deserializeRes.ok) return;

  const restored = deserializeRes.value;
  assert.equal(restored.metadata.id, id);
  assert.equal(restored.metadata.name, "English Novel Project");
  assert.equal(restored.book.metadata.title, englishBook.metadata.title);
  assert.equal(restored.book.metadata.language, "en");
  assert.deepEqual(restored.book, englishBook);
});

test("Kannada content: semantic Unicode code-point preservation through DTO serialization", () => {
  const id = createProjectId("kannada");
  const project = makeProject(id, "ಕನ್ನಡ ಕಾದಂಬರಿ", kannadaBook);

  const serializeRes = serializeProjectToDto(project);
  assert.equal(serializeRes.ok, true);
  if (!serializeRes.ok) return;

  const deserializeRes = deserializeProjectFromDto(serializeRes.value);
  assert.equal(deserializeRes.ok, true);
  if (!deserializeRes.ok) return;

  const restored = deserializeRes.value;
  assert.equal(restored.metadata.name, "ಕನ್ನಡ ಕಾದಂಬರಿ");
  assert.equal(restored.book.metadata.title, "ಕನ್ನಡ ಕಥೆ");
  assert.equal(restored.book.metadata.language, "kn");

  // Semantic Unicode code-point assertion on text content
  const origBlock = kannadaBook.chapters[0]?.blocks[0];
  const restBlock = restored.book.chapters[0]?.blocks[0];
  assert.ok(origBlock && origBlock.type === "paragraph");
  assert.ok(restBlock && restBlock.type === "paragraph");

  const origInline = origBlock.inlines[0];
  const restInline = restBlock.inlines[0];
  assert.ok(origInline && origInline.type === "text");
  assert.ok(restInline && restInline.type === "text");

  const expectedStr = "ನಮಸ್ಕಾರ. ಇದು ಪುಸ್ತಕ ಮಾದರಿ.";
  assert.equal(origInline.text, expectedStr);
  assert.equal(restInline.text, expectedStr);

  // Assert exact code-point equality
  const originalChars: string[] = Array.from(origInline.text);
  const restoredChars: string[] = Array.from(restInline.text);

  assert.equal(originalChars.length, restoredChars.length);
  for (let i = 0; i < originalChars.length; i += 1) {
    const origChar = originalChars[i]!;
    const restChar = restoredChars[i]!;
    assert.equal(
      origChar.codePointAt(0),
      restChar.codePointAt(0),
      `Code point mismatch at index ${i}: "${origChar}" vs "${restChar}"`,
    );
  }

  assert.deepEqual(restored.book, kannadaBook);
});

test("schema and version handling: rejects unsupported schema versions", () => {
  const project = makeProject("proj-valid-id", "Version Test", englishBook);

  // Unsupported project schemaVersion
  const badProjectSchema: OpenBookProject = {
    ...project,
    metadata: { ...project.metadata, schemaVersion: 99 as 1 },
  };
  const res1 = serializeProjectToDto(badProjectSchema);
  assert.equal(res1.ok, false);
  if (!res1.ok) {
    assert.equal(res1.error.code, "SCHEMA_VERSION_MISMATCH");
  }

  // Unsupported bookSchemaVersion
  const badBookSchema: OpenBookProject = {
    ...project,
    metadata: { ...project.metadata, bookSchemaVersion: 99 as 1 },
  };
  const res2 = serializeProjectToDto(badBookSchema);
  assert.equal(res2.ok, false);
  if (!res2.ok) {
    assert.equal(res2.error.code, "SCHEMA_VERSION_MISMATCH");
  }
});

test("invalid persistence data rejection: rejects malformed envelopes and corrupt payloads", () => {
  // Null or missing envelope
  assert.equal(deserializeProjectFromDto(null as unknown as PersistenceEnvelopeDto).ok, false);

  // Mismatched project ID
  const mismatchedEnvelope: PersistenceEnvelopeDto = {
    project: {
      id: "proj-aaa",
      name: "AAA",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      schema_version: 1,
    },
    document: {
      project_id: "proj-bbb",
      book_payload: JSON.stringify(englishBook),
      book_schema_version: 1,
      updated_at: new Date().toISOString(),
    },
  };
  const resMismatch = deserializeProjectFromDto(mismatchedEnvelope);
  assert.equal(resMismatch.ok, false);
  if (!resMismatch.ok) {
    assert.equal(resMismatch.error.code, "CORRUPT_DATA");
  }

  // Corrupt JSON payload
  const corruptJsonEnvelope: PersistenceEnvelopeDto = {
    project: {
      id: "proj-corrupt",
      name: "Corrupt",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      schema_version: 1,
    },
    document: {
      project_id: "proj-corrupt",
      book_payload: "{ not valid json ...",
      book_schema_version: 1,
      updated_at: new Date().toISOString(),
    },
  };
  const resCorrupt = deserializeProjectFromDto(corruptJsonEnvelope);
  assert.equal(resCorrupt.ok, false);
  if (!resCorrupt.ok) {
    assert.equal(resCorrupt.error.code, "CORRUPT_DATA");
  }

  // Book validation failure (missing language)
  const invalidBook: Book = {
    ...englishBook,
    metadata: { ...englishBook.metadata, language: "" },
  };
  const invalidProject = makeProject("proj-invalid-book", "Invalid Book", invalidBook);
  const resInvalidBook = serializeProjectToDto(invalidProject);
  assert.equal(resInvalidBook.ok, false);
  if (!resInvalidBook.ok) {
    assert.equal(resInvalidBook.error.code, "BOOK_VALIDATION_FAILED");
  }
});

test("absence of EPUB packaging fields: strictly rejected by serialization and deserialization", () => {
  const epubLeakingBook = {
    ...englishBook,
    opf: "package.opf",
    spine: ["item1", "item2"],
  } as unknown as Book;

  const leakingProject = makeProject("proj-epub-leak", "EPUB Leak", epubLeakingBook);

  // Serialization rejection
  const serializeRes = serializeProjectToDto(leakingProject);
  assert.equal(serializeRes.ok, false);
  if (!serializeRes.ok) {
    assert.equal(serializeRes.error.code, "EPUB_LEAK_DETECTED");
  }

  // Deserialization rejection
  const leakingEnvelope: PersistenceEnvelopeDto = {
    project: {
      id: "proj-epub-leak-dto",
      name: "EPUB Leak DTO",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      schema_version: 1,
    },
    document: {
      project_id: "proj-epub-leak-dto",
      book_payload: JSON.stringify(epubLeakingBook),
      book_schema_version: 1,
      updated_at: new Date().toISOString(),
    },
  };
  const deserializeRes = deserializeProjectFromDto(leakingEnvelope);
  assert.equal(deserializeRes.ok, false);
  if (!deserializeRes.ok) {
    assert.equal(deserializeRes.error.code, "EPUB_LEAK_DETECTED");
  }
});

test("persistence boundary does not depend on Tiptap JSON: rejects Tiptap doc objects", () => {
  const tiptapDoc = {
    type: "doc",
    content: [
      {
        type: "paragraph",
        content: [{ type: "text", text: "This is raw Tiptap JSON." }],
      },
    ],
  } as unknown as Book;

  const tiptapProject = makeProject("proj-tiptap", "Tiptap Project", tiptapDoc);
  const serializeRes = serializeProjectToDto(tiptapProject);
  assert.equal(serializeRes.ok, false);
  if (!serializeRes.ok) {
    assert.equal(serializeRes.error.code, "CORRUPT_DATA");
  }
});

test("SQLite persistence end-to-end: initialize, save, load, update, metadata, list, delete, cascade", async () => {
  const driver = new InMemorySqliteConnection();
  const persistence = new SqliteProjectPersistence(driver);

  // 1. Initialize
  const initRes = await persistence.initialize();
  assert.equal(initRes.ok, true);
  assert.equal(driver.migrations.length, 1);
  assert.equal(driver.migrations[0]!.version, 1);

  // 2. Save English project
  const id1 = createProjectId("p1");
  const p1 = makeProject(id1, "English Book One", englishBook);
  const save1 = await persistence.saveProject(p1);
  assert.equal(save1.ok, true);
  if (!save1.ok) return;
  assert.equal(save1.value.projectId, id1);

  // 3. Save Kannada project
  const id2 = createProjectId("p2");
  const p2 = makeProject(id2, "ಕನ್ನಡ ಕೃತಿ", kannadaBook);
  const save2 = await persistence.saveProject(p2);
  assert.equal(save2.ok, true);

  // 4. Load projects back and verify contents
  const load1 = await persistence.loadProject(id1);
  assert.equal(load1.ok, true);
  if (!load1.ok) return;
  assert.equal(load1.value.metadata.name, "English Book One");
  assert.equal(load1.value.book.metadata.title, englishBook.metadata.title);

  const load2 = await persistence.loadProject(id2);
  assert.equal(load2.ok, true);
  if (!load2.ok) return;
  assert.equal(load2.value.metadata.name, "ಕನ್ನಡ ಕೃತಿ");
  assert.equal(load2.value.book.metadata.title, "ಕನ್ನಡ ಕಥೆ");
  assert.deepEqual(load2.value.book, kannadaBook);

  // 5. Update project
  const updatedP1: OpenBookProject = {
    ...p1,
    metadata: {
      ...p1.metadata,
      name: "English Book One - Revised",
      updatedAt: new Date().toISOString(),
    },
  };
  const updateRes = await persistence.saveProject(updatedP1);
  assert.equal(updateRes.ok, true);

  const reloadedP1 = await persistence.loadProject(id1);
  assert.equal(reloadedP1.ok, true);
  if (!reloadedP1.ok) return;
  assert.equal(reloadedP1.value.metadata.name, "English Book One - Revised");

  // 6. Get metadata only
  const metaRes = await persistence.getProjectMetadata(id1);
  assert.equal(metaRes.ok, true);
  if (!metaRes.ok) return;
  assert.equal(metaRes.value.id, id1);
  assert.equal(metaRes.value.name, "English Book One - Revised");
  assert.equal(metaRes.value.schemaVersion, 1);
  assert.equal(metaRes.value.bookSchemaVersion, 1);

  // 7. List projects
  const listRes = await persistence.listProjects();
  assert.equal(listRes.ok, true);
  if (!listRes.ok) return;
  assert.equal(listRes.value.length, 2);
  const ids = listRes.value.map((p) => p.id);
  assert.ok(ids.includes(id1));
  assert.ok(ids.includes(id2));

  // 8. Delete project and verify cascade
  const deleteRes = await persistence.deleteProject(id1);
  assert.equal(deleteRes.ok, true);

  // Should no longer exist in projects or documents
  const loadDeleted = await persistence.loadProject(id1);
  assert.equal(loadDeleted.ok, false);
  if (!loadDeleted.ok) {
    assert.equal(loadDeleted.error.code, "NOT_FOUND");
  }

  assert.equal(driver.projects.has(id1), false);
  assert.equal(driver.projectDocuments.has(id1), false);

  // Delete non-existent project returns NOT_FOUND
  const deleteNotFound = await persistence.deleteProject("proj-does-not-exist");
  assert.equal(deleteNotFound.ok, false);
  if (!deleteNotFound.ok) {
    assert.equal(deleteNotFound.error.code, "NOT_FOUND");
  }

  // 9. Close
  const closeRes = await persistence.close();
  assert.equal(closeRes.ok, true);
});

test("atomic save transaction: rolls back project row if document upsert fails", async () => {
  const driver = new InMemorySqliteConnection();
  const persistence = new SqliteProjectPersistence(driver);
  await persistence.initialize();

  // Monkey-patch execute to simulate a mid-transaction database crash during document write
  const originalExecute = driver.execute.bind(driver);
  driver.execute = async (sql: string, params: unknown[] = []) => {
    if (sql.trim().toUpperCase().includes("INSERT INTO PROJECT_DOCUMENTS")) {
      throw new Error("Disk I/O error while writing document payload");
    }
    return originalExecute(sql, params);
  };

  const id = createProjectId("atomic-test");
  const project = makeProject(id, "Atomic Test Book", englishBook);

  const saveRes = await persistence.saveProject(project);
  assert.equal(saveRes.ok, false);
  if (!saveRes.ok) {
    assert.equal(saveRes.error.code, "DATABASE_ERROR");
    assert.match(saveRes.error.message, /Disk I\/O error/);
  }

  // Verify rollback: project row MUST NOT exist in storage
  assert.equal(driver.projects.has(id), false, "Project row should have rolled back");
  assert.equal(driver.projectDocuments.has(id), false, "Document row should not exist");
});

test("foreign-key enforcement and cascade: PRAGMA foreign_keys = ON is active", async () => {
  const driver = new InMemorySqliteConnection();
  const persistence = new SqliteProjectPersistence(driver);

  // Before init: foreign keys not enabled
  assert.equal(driver.foreignKeysEnabled, false);

  await persistence.initialize();

  // After init: foreign keys explicitly enabled
  assert.equal(driver.foreignKeysEnabled, true);

  // Inserting document for nonexistent project fails with foreign key error
  await assert.rejects(
    async () => {
      await driver.execute(
        "INSERT INTO project_documents (project_id, book_payload, book_schema_version, updated_at) VALUES (?, ?, ?, ?)",
        ["nonexistent-proj", "{}", 1, new Date().toISOString()],
      );
    },
    /FOREIGN KEY constraint failed/,
  );
});

test("getProjectMetadata: returns CORRUPT_DATA when project_documents row is missing", async () => {
  const driver = new InMemorySqliteConnection();
  const persistence = new SqliteProjectPersistence(driver);
  await persistence.initialize();

  const orphanId = createProjectId("orphan");
  // Insert project row directly without document row (simulating corrupted storage)
  await driver.execute(
    "INSERT INTO projects (id, name, created_at, updated_at, schema_version) VALUES (?, ?, ?, ?, ?)",
    [orphanId, "Orphan Project", new Date().toISOString(), new Date().toISOString(), 1],
  );

  const metaRes = await persistence.getProjectMetadata(orphanId);
  assert.equal(metaRes.ok, false);
  if (!metaRes.ok) {
    assert.equal(metaRes.error.code, "CORRUPT_DATA");
    assert.match(metaRes.error.message, /Document content missing/);
  }
});
