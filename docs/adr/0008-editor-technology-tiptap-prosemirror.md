# ADR 0008: Editor Technology Evaluation and Decision (Tiptap / ProseMirror)

- **Status:** Accepted; selected open-source editor package versions are **Frozen** for the authoring surface
- **Date:** 2026-09-07
- **Decision owner:** SanMitra Tech Solutions
- **Area:** Editor / Desktop authoring / Foundation
- **Decision:** Adopt **Tiptap** (headless React bindings) built on **ProseMirror** as the OpenBook desktop authoring editor technology. Pin the open-source MIT package set listed below. The editor must adapt *to* `@openbook/semantic-document` and must never become a parallel canonical model or write EPUB/PDF structures into the Book Model. This ADR does **not** implement the editor or add npm dependencies to the repository.

## Context

ADR-0004 preferred Tiptap/ProseMirror without freezing versions. PRs #11–#12 landed the Semantic Document Model contract and the desktop in-memory boundary:

```text
Editor (future) → SemanticDocument → Book (canonical) → publishing engines
```

OpenBook now needs a formal editor technology decision before any editor UI PR, covering:

- Tiptap/ProseMirror vs reasonable alternatives;
- exact package versions;
- licensing (MIT core vs commercial Tiptap Cloud/Pro extensions);
- React **19.2.8** / TypeScript **5.9.3** compatibility (ADR-0007);
- Kannada / Indic Unicode editing expectations;
- integration boundary with the existing SDM → Book architecture.

## Alternatives considered

| Option | License signal | Assessment | Result |
| --- | --- | --- | --- |
| **Tiptap + ProseMirror** | MIT (open-source editor packages) | Headless, first-class React bindings, schema-driven document model aligns with SDM blocks/inlines, large ecosystem | **Selected** |
| Raw ProseMirror only | MIT | Excellent foundation; no first-class React bindings; higher implementation cost for the same outcome | Rejected as primary app stack; retained as the engine under Tiptap |
| Lexical | MIT | Strong React story; different document model; weaker alignment with existing ProseMirror-oriented ADR-0004 direction | Rejected for MVP authoring surface |
| Slate | MIT | Flexible; less rigid schema discipline than ProseMirror for book-structured content | Rejected for MVP |
| CKEditor 5 | Mixed / commercial packaging | Heavier product surface; licensing and redistribution complexity for a FOSS Apache-2.0 desktop core | Rejected |

## Decision

### 1. Selected technology

Use **Tiptap** as the React authoring surface and **ProseMirror** (via `@tiptap/pm`) as the underlying editor toolkit.

### 2. Frozen open-source package versions (proposed adoption pins)

These exact versions are **Frozen** for the first editor implementation slice. They must not be installed until a later authorized implementation PR. Commercial Tiptap Cloud / Pro / paid extension packages are **out of scope** and must not become hidden core dependencies.

| Package | Exact version | SPDX |
| --- | --- | --- |
| `@tiptap/react` | **3.31.3** | MIT |
| `@tiptap/core` | **3.31.3** | MIT |
| `@tiptap/pm` | **3.31.3** | MIT |
| `@tiptap/starter-kit` | **3.31.3** | MIT |
| `@tiptap/extension-link` | **3.31.3** | MIT |

`@tiptap/pm` vendors/aligns ProseMirror dependencies. Representative upstream ProseMirror packages observed on npm at decision time (informational; locked transitively when installed):

| Package | Observed version | SPDX |
| --- | --- | --- |
| `prosemirror-model` | 1.25.11 | MIT |
| `prosemirror-view` | 1.42.3 | MIT |

Peer/runtime alignment: React **19.2.8**, TypeScript **5.9.3**, Vite **8.2.2** (already present in `apps/desktop` from ADR-0007 shell). No evidence that this Tiptap 3.31.x line requires a React or TypeScript major change.

### 3. Licensing conclusion

1. OpenBook remains **Apache-2.0** (ADR-0003). Tiptap/ProseMirror MIT licenses are compatible for embedding under `LICENSING_POLICY.md` preferred EMBED licenses.
2. Use **only** MIT-licensed open-source Tiptap packages required for local-first authoring.
3. **Do not** depend on Tiptap Cloud, Pro subscriptions, or paid-only extensions for MVP core editing.
4. Preserve copyright/NOTICE obligations for MIT packages at first ship; regenerate third-party notices when the editor implementation PR adds the packages.
5. Apache-2.0 for OpenBook does **not** relicense Tiptap or ProseMirror.

### 4. Compatibility with Semantic Document Model → Book Model

Required architecture (unchanged):

```text
Tiptap / ProseMirror (UI state)
        ↓ EditorAdapter (to be built later)
SemanticDocument (@openbook/semantic-document)
        ↓ semanticDocumentToBook / desktop domain boundary
Book (@openbook/book-model)   ← canonical publishing source of truth
        ↓
EPUB / HTML / PDF engines (later)
```

Rules:

1. Tiptap document JSON / ProseMirror nodes are **editor transport**, not the Book Model.
2. The adapter must produce/consume `SemanticDocument` only; engines continue to consume `Book`.
3. SDM block/inline coverage (paragraph, heading, quote, list, image; text/emphasis/strong/link) defines the minimum editor schema. Extensions beyond that need an SDM/Book Model ADR before becoming authoring truth.
4. Deterministic SDM → Book mapping (PR #11) remains authoritative; editor round-trips must not invent EPUB packaging fields.
5. Desktop domain boundary from PR #12 remains the application integration point for projection; the editor UI must call into that boundary (or an equivalent service), not bypass it into engines or SQLite.

### 5. Kannada / Indic Unicode

1. Editing surface Unicode integrity is required (insert/edit/delete Kannada text without corruption).
2. Glyph shaping in the editor WebView is provided by the platform/browser stack; OpenBook still owns Indic acceptance tests for authoring and publishing.
3. Complex cursor/cluster behaviour for Indic scripts must be verified in the first editor implementation PR against Kannada fixtures; failure is a product defect to fix or escalate, not a silent waiver.
4. Publishing-quality Indic layout (HarfBuzz/Pango/fonts) remains a separate DTP/publishing concern (not solved by choosing Tiptap).

### 6. Editor integration boundary

| Layer | Responsibility | Must not |
| --- | --- | --- |
| Tiptap React UI | Capture user edits, commands, selection | Own canonical book semantics; call EPUBCheck; write SQLite schemas |
| EditorAdapter | Bidirectional map Tiptap/PM ↔ `SemanticDocument` | Emit EPUB OPF/spine/nav; mutate Book packaging fields |
| Semantic Document | Format-neutral editor contract | Become publishing output format |
| Desktop domain boundary | Validate SDM, project to Book, validate Book | Persist production DB schema in this decision |
| Book Model | Canonical publishing source of truth | Depend on Tiptap types |

### 7. Why this selection is appropriate

- Matches ADR-0004 preferred direction with now-frozen exact versions.
- Schema-driven ProseMirror model maps cleanly onto SDM structured blocks/inlines.
- First-class React 19 integration via `@tiptap/react`.
- MIT licensing fits Apache-2.0 core EMBED preferences without AGPL/copyleft risk for the selected packages.
- Headless design allows OpenBook-controlled UI chrome (Beginner/Expert modes) without adopting Tiptap Cloud.
- Preserves the architectural boundary already proven in PRs #11–#12.

## What this ADR does not authorize

- Installing Tiptap/ProseMirror (or any editor) dependencies in this repository
- Implementing editor UI or EditorAdapter code
- Changing `@openbook/book-model` or `@openbook/semantic-document`
- Changing the desktop shell beyond a future authorized editor PR
- SQLite persistence, EPUB/HTML/PDF engines, PDF renderer selection, EPUBCheck changes, or AI/Ollama

## Freeze-lift for a later editor implementation PR

A subsequent PR may install the Frozen package pins above and implement a minimal EditorAdapter + authoring UI **only** if it:

1. maps exclusively through `SemanticDocument`;
2. projects to Book via the existing domain boundary (or equivalent);
3. includes English and Kannada editing fixtures/tests;
4. adds no Tiptap commercial/Cloud dependencies;
5. does not expand into publishing engines or persistence schema.

## Acceptance criteria (governance)

1. Editor technology selected and justified.
2. Exact MIT package versions recorded and Frozen.
3. Licensing boundary (OSS MIT only; no paid Cloud for core) recorded.
4. SDM → Book integration boundary defined.
5. Kannada/Indic verification obligations stated.
6. No editor implementation or dependency install in the ADR PR.

## Related documents

- `docs/adr/0004-publishing-engine-technology-architecture.md`
- `docs/adr/0006-book-model-executable-specification.md`
- `docs/adr/0007-desktop-foundation-technology-baseline-and-freeze-lift.md`
- `packages/semantic-document/CONTRACT.md`
- `docs/IMPLEMENTATION-BACKLOG.md`
- `docs/PUBLISHING_ENGINE_TECHNOLOGY_SCORECARD.md`
- `LICENSING_POLICY.md`

## References

- Tiptap: https://tiptap.dev/
- Tiptap React install: https://tiptap.dev/docs/editor/getting-started/install/react
- ProseMirror: https://prosemirror.net/
- npm: `@tiptap/react`, `@tiptap/pm`, `@tiptap/starter-kit`, `@tiptap/extension-link` (versions as of this ADR date)
