# 01 — Project Vision

**Status of this document:** DECIDED where the Product Owner has already stated the shape of the product. Narrative detail, personas, and success criteria are **PROPOSED** pending Product Owner approval.

## 1. What OpenBook is

**DECIDED.** OpenBook Studio is an open-source **desktop and digital publishing studio**. People use it to **write, design, typeset, validate, and publish books**.

**DECIDED.** It is a single product with a beginner → professional journey, not a pile of disconnected tools.

**DECIDED.** It is organised as studios over one Book Model:

- Writing Studio
- Design Studio
- DTP Studio
- AI Studio
- Book Doctor
- Preview
- Publishing

**DECIDED.** Accessibility and multilingual support are first-class, not add-ons.

**PROPOSED one-sentence pitch.** OpenBook is the FOSS studio where a book is a structured work you grow from first draft to publish-ready EPUB, PDF, and HTML — without starting over when you outgrow the beginner tools.

## 2. What OpenBook is not

**DECIDED.**

- Not a conventional EPUB editor (not “Sigil with a new skin”).
- Not a print-only DTP clone that treats EPUB as an afterthought.
- Not an AI writer that emits a book-shaped dump of text.

**PROPOSED further non-goals** (reject or accept explicitly):

- Not a general word processor for letters, reports, and office documents.
- Not a bookstore, DRM platform, or commercial storefront.
- Not a page-layout tool for magazines, posters, or packaging (book-shaped work only).
- Not a collaborative InDesign-in-the-browser until collaboration is a DECIDED requirement.

## 3. Who it is for

**DECIDED.** The product must serve a **beginner → professional** journey in one application.

**PROPOSED personas** (need ranking for v1):

| Persona | Need | Mode |
| --- | --- | --- |
| First-time author | Write chapters, pick a sensible theme, preview, export a valid ebook and a readable PDF | Beginner |
| Independent publisher | Metadata, ISBNs, covers, consistent series design, store-ready packages | Beginner → Expert |
| Designer | Themes, typography, covers, figure layout, brand-consistent styling | Design Studio |
| Typesetter / DTP operator | Spreads, masters, baselines, hyphenation, page furniture, print PDF | DTP Studio / Expert |
| Translator / multilingual publisher | Multiple scripts, directionality, localisation of UI and of books | All modes |
| Accessibility specialist | Semantics, image descriptions, reading order, checks against published guidance | Book Doctor |
| Educator / technical author | **OPEN** whether textbooks, maths, and citations are in v1 | — |

**OPEN.** Which persona is the *primary* v1 user? Without that ranking, every studio will try to be complete on day one.

## 4. What problem it solves

**PROPOSED problem statement** (the Product Owner named the problem space; this wording is for approval):

Book-making is split across tools that each own *one* projection of the work:

| Tool class | Strength | Failure for OpenBook’s user |
| --- | --- | --- |
| Word processors | Writing | Weak semantics, weak typesetting, accidental EPUB |
| EPUB editors | Format internals | Print and DTP are second-class; beginners drown in OPF/XHTML |
| DTP (InDesign, Scribus) | Paginated design | Reflowable ebook is an export hack; licence or complexity walls |
| Converter chains (Pandoc, Calibre) | Format hopping | The “source” is whoever last converted; design intent decays |
| AI chat tools | Fast prose | No book model, no validation, no typesetting, no provenance |

The user is forced to **pick a format identity** too early: “I am making an EPUB” or “I am making a print PDF”. OpenBook’s claim is that they are **making a book**, and the formats are projections of that book.

## 5. Beginner → professional journey

**DECIDED.** There is a Beginner Mode and an Expert Mode.

**PROPOSED journey** (needs Product Owner confirmation that this is the intended slope, not a different one):

1. **Start writing.** Chapters, sections, plain emphasis. Sensible defaults. No OPF, no master pages, no CSS.
2. **Look like a book.** A theme, a cover, a title page, a generated table of contents. Preview as ebook *and* as pages.
3. **Own the design.** Styles, running heads, figures, notes, language metadata. Design Studio becomes the centre of gravity.
4. **Own the page.** DTP Studio: spreads, baselines, hyphenation, floats, print marks. Expert Mode unlocks EPUB internals and preflight detail.
5. **Pass the doctor.** Book Doctor plus EPUBCheck and PDF preflight. “Publish ready” is a state of the Book Model, not a checkbox on an export dialog.
6. **Publish.** Packages and artefacts. Destinations are **OPEN**.

**OPEN.**

- Is the beginner/expert split a **hard switch**, a **progressive disclosure**, or **per-studio**?
- Is there an Intermediate Mode, or only two modes?
- Can a beginner file be opened in Expert Mode without breaking, and vice versa? (Architecture says it must, because there is one Book Model — confirm.)

## 6. FOSS philosophy

**DECIDED.** OpenBook is to become a **serious FOSS project**, not an accidental collection of incompatible projects.

**PROPOSED principles** for approval:

1. **Users can run, study, change, and share the studio itself.** That requires a project licence (currently **OPEN**).
2. **The commons is curated.** Every external capability is classified USE / ADAPT / INSPIRE / EXTERNAL / AVOID before it touches the tree.
3. **Copyleft vs permissive is a Product Owner decision**, not an engineering convenience. It changes what may be USE’d.
4. **Inspiration is not appropriation.** INSPIRE means we study capability and UX, then implement our own code against our Book Model.
5. **External tools stay external** until an ADR moves them. Shipping “OpenBook + a bundled GPL editor we do not control” is how FOSS products become unmaintainable.
6. **Community governance is not implied by a public repo.** Governance, CLA/DCO, and trademark are **OPEN**.

## 7. AI philosophy

**DECIDED.** There is an AI Studio. AI is part of the product, not a hidden copilot bolted onto a text field.

**DECIDED.** AI must not replace the Book Model as source of truth.

**PROPOSED AI principles** (need explicit accept/reject — this is a high-risk area):

1. **Propose, do not possess.** AI suggestions land as reviewable edits, not as silent rewrites of structure.
2. **Provenance.** The model records whether a span or asset was human-authored, AI-proposed then accepted, or AI-generated pending review.
3. **Bounded jobs.** AI operates on named tasks (outline, blurbs, alt text drafts, consistency checks), not unbounded “make this a book”.
4. **The author remains legally and morally the author.** OpenBook will not claim the AI wrote the book.
5. **Data boundary is a product decision.** Whether manuscript text may leave the machine, which providers are allowed, and whether a local model is required for default installs are **OPEN**.
6. **AI must respect multilingual and accessibility intent.** It must not “helpfully” strip diacritics, flatten scripts, or invent alt text that is presented as author-verified.

**OPEN.** Local vs cloud vs user-bring-your-key; default off vs default on; training-data ethics policy; whether AI may generate images.

## 8. DTP + EPUB + PDF relationship

**DECIDED.** The relationship is:

```text
                    OPENBOOK STUDIO
                          │
          ┌───────────────┴───────────────┐
          │                               │
    USER EXPERIENCE                  BOOK MODEL
          │                               │
 ┌────────┼─────────┐                     │
 │        │         │                     │
Writing  Design    DTP                    │
Studio   Studio   Studio                  │
 │        │         │                     │
 └────────┴─────────┴──────────────┬──────┘
                                   │
                         SINGLE SOURCE OF TRUTH
                                   │
                 ┌─────────────────┼─────────────────┐
                 │                 │                 │
                EPUB              PDF              HTML
                 │                 │                 │
             EPUBCheck         Preflight          Web
                 │                 │
                 └────────┬────────┘
                          │
                    BOOK DOCTOR
                          │
                    PUBLISH READY
```

**DECIDED interpretation:**

- Writing, Design, and DTP are user-experience surfaces on one Book Model.
- EPUB, PDF, and HTML are outputs of that model.
- EPUBCheck validates the EPUB projection.
- Preflight validates the PDF projection.
- HTML is the web projection.
- Book Doctor consumes validation (and, **PROPOSED**, additional semantic/accessibility checks) and produces a publish-ready state.

**PROPOSED design consequence** (the hard product idea — must be confirmed):

Paginated design (DTP/PDF) and reflowable design (EPUB/HTML) **disagree**. OpenBook should treat that disagreement as a first-class concern:

- Shared: structure, semantics, style *intent*, assets, languages, accessibility.
- Projection-specific: page breaks, spread layout, hyphenation dictionaries, fixed vs fluid images, running heads, print bleed.
- Conflicts are visible in Preview and Book Doctor, not hidden inside an exporter.

**OPEN.** The actual conflict policy: which projection wins when they disagree; whether fixed-layout EPUB exists; whether HTML is a product artefact or only a preview substrate. See ADR-OPEN items in the decision log.

## 9. Success (PROPOSED)

OpenBook is succeeding when:

1. A first-time author can produce a **valid EPUB 3** and a **print-intention PDF** from the same work without opening a second application.
2. A professional can take that same work into DTP Studio without a round-trip import that destroys structure.
3. Book Doctor can explain, in author language and in expert language, why a work is not yet publish-ready.
4. A competent third party can rebuild the studio from this repository under the (still OPEN) project licence.
5. A future engineer cannot add a library without passing the FOSS classification gate.

## 10. Name and identity

**OPEN — blocking.** “OpenBook Studio” collides with existing organisations (including an interior-design practice using that name). The GitHub repo is `openbook`. No trademark search has been recorded here. The Product Owner must decide the public product name, spelling, and trademark posture before a public launch narrative hardens.
