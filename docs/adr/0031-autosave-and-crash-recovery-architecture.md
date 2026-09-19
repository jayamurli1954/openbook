# ADR-0031: Autosave & Crash Recovery Architecture

- **Status:** Accepted (Slices 1–5 implemented)
- **Date:** 2026-09-19
- **Area:** Desktop / Project persistence / Session durability
- **Depends on:** ADR-0006, ADR-0019, ADR-0029 (Slices 1–6 complete)
- **Supersedes:** None

## 1. Context

OpenBook now has a durable filesystem project package (ADR-0029): atomic Save/Open, CAS assets, integrity evidence, and explicit migration/recovery from `.openbook-backup-*`. When a package root is bound, explicit Save commits the package first and syncs SQLite as a session index; unbound sessions remain SQLite-only.

Authors must not lose work on crash or idle exit. Autosave and crash recovery are required product capabilities (see `docs/IMPLEMENTATION-BACKLOG.md`). They must not create a second document source of truth or persist Tiptap/ProseMirror JSON.

## 2. Decision

OpenBook will implement autosave and crash recovery as a **policy layer over the ADR-0029 project-package Save boundary**, not as a parallel persistence model.

```text
Editor / BookSession edits
        |
        v
AutosaveController (dirty + debounce)
        |
        v
PackageAutosavePort --> saveProjectPackage(...)
        |
        v
ADR-0029 project package (atomic staging + integrity)
```

### 2.1 Canonical ownership (unchanged)

1. `@openbook/book-model` `Book` remains the only durable document truth.
2. Tiptap/ProseMirror JSON remains ephemeral editor transport and must never be autosaved as project truth.
3. Autosave must serialize the same canonical Book (+ asset bindings) that explicit package Save would write.
4. SQLite `ProjectPersistence` may remain a session/index aid until a later migration slice; it must not become a second autosave target that diverges from the package.

### 2.2 Autosave policy

1. **Dirty tracking:** callers mark the session dirty after canonical Book mutations (not after every keystroke at the Tiptap layer unless those keystrokes have already been applied into Book).
2. **Debounce:** a configurable quiet period (default **2000 ms**) after the last `markDirty` before an autosave attempt.
3. **Coalescing:** overlapping dirty marks during an in-flight save schedule one follow-up save after completion.
4. **Fail-closed reporting:** save failures are surfaced as structured autosave errors; they must not silently discard dirty state.
5. **Bound package required:** autosave runs only when a project package root (and required bindings/store inputs) are configured; unbound sessions do not invent a package path.
6. **Explicit Save remains:** user-initiated Save uses the same package boundary (or a later unified Save API); autosave is not a separate file format.

### 2.3 Crash recovery policy

1. **Primary protection:** ADR-0029 atomic staging/rename Save already preserves the last committed package until commit succeeds.
2. **Backup restore:** `recoverProjectPackage` may restore an orphaned `.openbook-backup-*` sibling when live commit failed mid-flight.
3. **No invention:** recovery must not synthesize empty Books, rewrite integrity digests to match tampered JSON, or persist Tiptap drafts as Book.
4. **User-visible recovery (later slices):** presenting “recover last package / discard” UI is separately sliced and must call recover/open APIs rather than inventing content.
5. **Sidecar draft journals** (append-only edit logs) are **not** authorized by this ADR; if needed later, they require a new decision.

### 2.4 Relationship to Desktop Studio

ADR-0019 remains authoritative for the coordinator. Autosave wiring into `DesktopStudioCoordinator` / React is **implementation-sliced** and must not move filesystem policy into React components.

### 2.5 Implementation sequencing

1. Autosave controller (dirty/debounce/coalesce) + injectable Save port — **Slice 1** (done)
2. Package Save port adapter (`saveProjectPackage` + bindings/store) — **Slice 2** (done)
3. Coordinator dirty hooks + bound project root — **Slice 3** (done)
4. Crash-recovery discovery / open-with-recover path — **Slice 4** (done)
5. Unification of SQLite session Save with package Save — **Slice 5** (done)

## 3. Explicit non-authorizations

This ADR does **not** authorize:

- Gate 10 packaging/release;
- cloud sync;
- persisting Tiptap/ProseMirror JSON;
- a second autosave file format beside the project package;
- dual-write schemes that allow SQLite Book and package Book to diverge permanently without a migration plan;
- DTP/AI work;
- silent recovery that mutates Book content without user-visible policy.

## 4. Acceptance criteria

Architecture acceptance confirms that this ADR:

1. binds autosave to the ADR-0029 package Save boundary;
2. preserves Book Model authority and rejects Tiptap-as-truth;
3. defines dirty/debounce/coalesce and fail-closed error reporting;
4. defines crash recovery in terms of atomic package Save + `recoverProjectPackage`;
5. leaves coordinator UI wiring and Gate 10 separately sliced/gated;
6. requires per-slice implementation authorization.

## 5. Governance

Normal branch → Draft PR → CI/DCO → review → explicit Ready → explicit merge authorization.
