# ADR-0030: Gate 9 — Export UI & Native Save As Architecture

- **Status:** Accepted; Gate 9 implementation Slices 1–5 complete
- **Date:** 2026-09-18
- **Gate:** Gate 9
- **Area:** Desktop / Export / Native Filesystem Boundary
- **Supersedes:** None

## Context

OpenBook's publishing engines and the Gate 8 desktop publishing coordinator already provide in-memory EPUB, HTML, and PDF export results. The desktop product still needs a user-facing export surface and a native destination-selection/write boundary so an author can get those artifacts onto disk.

Gate 8 ADR-0023 deliberately keeps DesktopStudioCoordinator read-only with respect to the filesystem: export methods generate and verify artifacts in memory and must not write to disk or SQLite. Native dialogs and filesystem writes therefore belong to the desktop host boundary.

The project also has a separate ADR-0029 filesystem project-package architecture. Exported publication artifacts are outputs, not project-package persistence, and must not be conflated with Save/Open of an OpenBook project.

## Decision

OpenBook will implement Gate 9 as a desktop export architecture with the following boundary:

    React Export UI
          |
          v
    Desktop Export Host Adapter
          |
          +--> Tauri native Save As / filesystem boundary
          |
          v
    DesktopStudioCoordinator
          |
          +--> EPUB engine
          +--> HTML engine
          +--> PDF engine
          +--> existing validation / verification

### 1. Existing publishing coordinator remains authoritative

The desktop export host must invoke the existing DesktopStudioCoordinator.exportEpub, exportHtml, and exportPdf APIs rather than duplicating publishing logic.

The coordinator remains responsible for:

- workflow-state authorization;
- PREVIEW/PUBLISH policy;
- Phase 1 Book Doctor validation;
- format-specific generation;
- Phase 2 artifact verification;
- deterministic publishing behavior;
- cancellation through AbortSignal;
- structured generation, validation, conformance, and runtime/process results.

The Gate 9 host/UI must not weaken or bypass these policies.

### 2. Native Save As belongs to the host boundary

The React/UI layer requests an export through a host adapter. The host adapter is responsible for invoking the platform-native destination-selection mechanism and writing the returned artifact to disk.

DesktopStudioCoordinator must not:

- open native dialogs;
- select filesystem paths;
- write files;
- overwrite files;
- access arbitrary filesystem locations;
- store binary export artifacts in SQLite.

A native dialog implementation/dependency is an implementation-time detail and must be evaluated explicitly rather than silently adding a new Tauri plugin.

### 3. Export flow

The intended flow is:

1. User selects Export.
2. UI presents EPUB, HTML, and PDF choices appropriate to the current workflow state.
3. The host obtains a native Save As destination.
4. Cancelled destination selection produces no export and no filesystem mutation.
5. The host validates the destination and requested output representation.
6. The host invokes the appropriate coordinator export method.
7. Existing validation/verification rules run unchanged.
8. The host writes the verified artifact to the selected destination.
9. The host verifies successful completion of the filesystem write where practical.
10. UI reports success or a structured failure without mutating the canonical Book.

Generation cancellation must propagate through the existing AbortSignal boundary. Filesystem failures must remain host/file-write failures and must not be represented as Book Model mutations.

### 4. Filename and extension policy

The desktop export surface should derive a deterministic default filename from Book metadata/title and sanitize it for the target filesystem, including invalid characters, reserved names, unsafe trailing characters, and practical filename-length limits.

The selected export format determines the expected extension:

- EPUB: .epub
- PDF: .pdf
- HTML: the final publication representation defined by the HTML engine/host contract.

The implementation must not silently change the requested format or silently produce a misleading extension.

### 5. Overwrite policy

An existing destination must never be silently overwritten.

The host must obtain explicit overwrite confirmation where the native platform requires application-level confirmation. Declining overwrite cancels the filesystem write and reports a non-error cancellation outcome to the UI.

Where practical, artifact writes should use a safe temporary-write and rename/replace sequence so a failed write does not leave a partially written final artifact.

### 6. HTML export resource integrity

HTML export requires an explicit representation decision because the HTML publishing engine may produce an HTML publication with associated CSS and image/resource files.

Gate 9 must not discard required CSS, images, or other publication resources merely to force HTML into a single-file Save As operation. The implementation contract must define whether HTML export is a single-file artifact or a resource bundle and must preserve deterministic resource references.

### 7. Error model

The host boundary must distinguish user cancellation and host/filesystem failures from existing coordinator and publishing failures.

Examples of host-level outcomes include:

- EXPORT_CANCELLED
- EXPORT_DESTINATION_INVALID
- EXPORT_DESTINATION_UNWRITABLE
- EXPORT_OVERWRITE_DECLINED
- EXPORT_WRITE_FAILED

Existing coordinator errors and format-specific diagnostics must be preserved rather than flattened into a generic UI error.

### 8. Security boundary

Gate 9 must not introduce shell execution or arbitrary runtime/binary paths.

The export host must:

- use the native filesystem/dialog boundary;
- avoid shell commands for file creation or copying;
- reject invalid destinations before writing;
- keep overwrite confirmation explicit;
- clean up temporary artifacts after cancellation/failure where applicable;
- keep project persistence and export artifacts separate;
- avoid binary storage in SQLite.

### 9. State and UI behavior

The UI should surface the existing workflow job state for export generation and verification. Host presentation state may additionally represent native-dialog and filesystem-write phases.

Export remains subject to the established workflow semantics:

- export is available only in permitted PREVIEW/PUBLISH states;
- the Book Doctor clean gate remains required;
- EPUB PUBLISH export requires mandatory EPUBCheck verification;
- PREVIEW may use the existing EPUB fast-validation policy;
- PDF export preserves Typst compilation diagnostics/status;
- HTML export preserves deterministic build success and diagnostics.

No new validation engine is introduced by Gate 9.

## Dependencies and constraints

Gate 9 builds on:

- ADR-0007 — Desktop foundation technology baseline
- ADR-0014 — End-to-End Book Production Workflow Architecture
- ADR-0018 — Book Doctor Validation Coordinator Architecture
- ADR-0019 — Desktop Studio Integration Architecture
- ADR-0022 — Desktop Studio Book Doctor Validation Integration Architecture
- ADR-0023 — Desktop Studio Publishing & Export Integration Architecture
- ADR-0029 — Project Package & Filesystem Persistence Architecture

ADR-0029 remains independently gated. Gate 9 export writes are not project Save/Open and must not create a parallel persistence model.

## Testing requirements

Implementation must include automated coverage for, at minimum:

- export format selection;
- deterministic filename derivation and filesystem-safe sanitization;
- native Save As cancellation;
- invalid/unwritable destination handling;
- overwrite confirmation and decline;
- correct coordinator invocation for EPUB/HTML/PDF;
- PREVIEW/PUBLISH policy preservation;
- Book Doctor validation failure propagation;
- EPUBCheck/Typst/HTML verification failure propagation;
- generation cancellation through AbortSignal;
- successful artifact writes;
- write failure and temporary-artifact cleanup;
- no mutation of the canonical Book;
- HTML resource/bundle integrity;
- absence of shell/arbitrary-runtime-path behavior;
- absence of binary export persistence in SQLite.

## Non-goals

Gate 9 does not authorize or redesign:

- the Book Model;
- the Semantic Document Model;
- EPUB/HTML/PDF publishing engines;
- EPUBCheck packaging;
- Book Doctor validation;
- project-package persistence from ADR-0029;
- autosave or crash recovery;
- SQLite schema redesign;
- cloud sync;
- AI/Ollama integration;
- DTP/page-layout implementation;
- new external validators;
- network publishing;
- release signing.

## Implementation authorization

Acceptance of this ADR establishes the architecture only. It does not by itself authorize implementation.

Implementation should proceed as separately authorized slices, in this order:

1. export host contract/adapter;
2. native Save As and safe filesystem write boundary;
3. React export UI;
4. end-to-end export verification and hardening.

Each slice requires the normal explicit implementation authorization and review/merge controls.

## Acceptance criteria for Gate 9 implementation

Gate 9 will be considered implemented only when the desktop application provides a usable export path for EPUB, HTML, and PDF through native destination selection, while:

- reusing the existing DesktopStudioCoordinator;
- preserving all existing workflow and verification gates;
- keeping filesystem writes outside the coordinator;
- preserving HTML resource integrity;
- never silently overwriting an existing artifact;
- handling cancellation and failures deterministically;
- leaving the canonical Book unchanged;
- keeping project persistence separate from publication export;
- passing the required automated security, boundary, and integration tests.

## Rationale

This architecture completes the missing product-facing boundary around already-implemented publishing engines without moving filesystem concerns into domain or publishing layers. It preserves the project's single canonical Book Model, keeps publication generation deterministic and testable, and makes native desktop I/O an explicit host responsibility.
