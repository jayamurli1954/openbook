# Phase 1 — Next Domain Selection: Lesson Box (Callout Block)

- **Status:** Selected; ADR-0041 accepted (PR #192); Slice 1 done on main (PR #196, `docs/adr-0041-slice-1-callout-model.md`); Slice 2 authorized 2026-10-29 and in progress (`docs/adr-0041-slice-2-callout-publishing.md`)
- **Date:** 2026-10-29
- **Baseline:** `main` at `7058947` (PR #190 — ADR-0040 title variants status reconcile)
- **Prior records:** `docs/adr-0038-closure-reconciliation.md`; `docs/conversations/2026-10-29-pdf-empty-figure-caption.md`
- **Selected domain:** a semantic **callout block**, shown as a framed "lesson box" (ROADMAP §3.3 Writing Studio content, §3.5 Basic Design Studio)
- **Architecture ADR:** ADR-0041 (accepted in PR #192). Selection alone does not authorize a slice.

## 1. Why this domain

A full review of the maintainer's published children's book (25 stories, KDP) through OpenBook found that each story ends with a short "What We Learned" lesson the author wants set apart from the story. In the KDP file, two stories drew the frame with box-drawing characters and emoji (`╭──╮ 🌟✨ … ╰──╯`), which break apart on reflowable screens; the other 23 used a plain bold label. The author asked whether the Design step can insert a text box.

It cannot today:

- the Book Model's `ContentBlock` union has `paragraph`, `heading`, `quote`, `list`, and `image` only;
- the Design step (ADR-0036) sets theme, fonts, text size, and line height; paragraph spacing, image treatment, and chapter openings are deferred;
- `quote` is the closest block, but renders as an italic indented quotation, which is a different meaning.

A lesson, tip, or note set apart in a box is common in children's, educational, and how-to books, and it can be represented semantically ("this is a callout titled X") without page layout. It works in reflowable EPUB, HTML, and PDF alike.

## 2. Scope chosen by the maintainer

On 2026-10-29 the maintainer asked for the ADR ("Draft the ADR") after this plan was set out:

- a **lesson box** block: an optional title (e.g. "What We Learned") and one paragraph of text, shown framed;
- the same box in EPUB (including Kindle), HTML, and PDF;
- made in the Writing Studio; one default look for the whole book.

Positioned text boxes, text placed on pictures, and picture-book page layouts (the maintainer's other examples) are **not** this domain. They need fixed-layout EPUB and a page model, which are ROADMAP Phase 2 (§4.2 Page Layout Engine, "text frames"), not started.

## 3. What this selection authorizes

1. Accept ADR-0041 Lesson Box (Callout Block) Architecture (PR #192).
2. Record that the next Phase 1 product domain is the lesson box.

## 4. What this selection does **not** authorize

- Any ADR-0041 implementation slice, including the Book Model change
- Positioned or floating text boxes, sidebars beside the text, or text over pictures
- Fixed-layout EPUB, page frames, spreads, or bleed (Phase 2)
- Per-box colours, icons, emoji, or multiple callout kinds
- Automatic conversion during Word or Markdown import
- Changing Typst, font, or frozen desktop pins

## 5. Controlled sequence after ADR acceptance

1. Merge this selection + ADR-0041 (Draft PR → CI/DCO → explicit merge authorization).
2. Schema version decided: bump to 2 with an identity migration (ADR-0041 §6, maintainer 2026-10-29).
3. Maintainer separately authorizes each implementation slice per ADR-0041 §7.

## 6. Candidates not selected

| Candidate | Why not now |
|---|---|
| Picture-book / fixed-layout pages | Phase 2 page model and fixed-layout EPUB; much larger; not needed to fix the lesson boxes |
| Styling `quote` as a box | Changes the meaning and look of every real quotation |
| Design Studio "chapter opening" / "image treatment" | Useful, but they don't give the author a box; can follow later |
| Detecting "What We Learned:" during Word import | Too guess-prone as an import rule; ADR-0041 offers an explicit book-wide "turn into lesson boxes" action instead |
