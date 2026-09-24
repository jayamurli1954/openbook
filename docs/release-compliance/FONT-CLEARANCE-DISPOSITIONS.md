# Gate 6 Bundled Font — Release Clearance Dispositions

- **Status:** Evidence ops Slice 2 — font-by-font dispositions recorded
- **Date:** 2026-09-22
- **Authority:** ADR-0028; `FONT-PROVENANCE-POLICY.md`; Gate 6 packaging inventory
- **Selection:** `FOUNDATION-READINESS-EVIDENCE-OPS-SELECTION.md` (Slice 2)
- **FOUNDATION-READY:** **Not declared** by this disposition record

## 1. Purpose

Record authoritative release-clearance dispositions for the four fonts pinned for Gate 6 PDF packaging / Gate 10 Windows shipping, using the ADR-0028 font provenance policy hierarchy.

This does **not** acquire new fonts, change pins, or declare `FOUNDATION-READY`.

## 2. Common disposition basis

For each font below:

| Evidence element | Basis |
|---|---|
| Family / file | `packages/pdf/packaging/inventory.json` `#fonts.files` |
| Integrity (SHA-256) | Same inventory pin |
| Upstream distribution | `google/fonts` `ofl/<family>/` (authoritative upstream directory) |
| License text | Upstream `OFL.txt` in that directory (SIL Open Font License 1.1) |
| Copyright line | As stated in that `OFL.txt` (Noto Project Authors) |
| Redistribution | **conditional** — OFL 1.1 permits bundling with software if the copyright notice and OFL are included with each copy; fonts must not be sold by themselves; derivatives remain under OFL |
| Notice obligation | **required** — ship `OFL.txt` (or equivalent OFL notice) with the font files (Gate 6 packaging already extracts `OFL.txt` beside fonts when available) |
| Product scope | Gate 6 `.cache/pdf-runtime/fonts` and Gate 10 packaged `pdf-runtime/fonts` |

Verified upstream OFL URLs (2026-09-22):

- https://raw.githubusercontent.com/google/fonts/main/ofl/notoserifkannada/OFL.txt
- https://raw.githubusercontent.com/google/fonts/main/ofl/notosanskannada/OFL.txt
- https://raw.githubusercontent.com/google/fonts/main/ofl/notoserif/OFL.txt
- https://raw.githubusercontent.com/google/fonts/main/ofl/notosans/OFL.txt

## 3. Font-by-font dispositions

| Component | Inventory file | SHA-256 | Status | Redistribution |
|---|---|---|---|---|
| Noto Serif Kannada | `NotoSerifKannada[wght].ttf` | `3d97c98dd59251a85fcc6e95edf9be02b60147e92486927390247f1cd4d5eb37` | **confirmed** | **conditional** (OFL 1.1) |
| Noto Sans Kannada | `NotoSansKannada[wdth,wght].ttf` | `cca4f3b3a8cb12fb261f1b43baf5d2f7f59d90fe123d41f0065ed3a183997ec9` | **confirmed** | **conditional** (OFL 1.1) |
| Noto Serif | `NotoSerif[wdth,wght].ttf` | `4d8e6761424656867019081a1a01336f3cb086982682698714054fc33f782713` | **confirmed** | **conditional** (OFL 1.1) |
| Noto Sans | `NotoSans[wdth,wght].ttf` | `bfb7bb691513f12e734dc346c03a03f784912432d7e3fa8e56efcf906fe86b3d` | **confirmed** | **conditional** (OFL 1.1) |

## 4. Shipping conditions (must remain true)

1. Each shipped copy of these fonts must include the applicable copyright notice and SIL OFL 1.1 text.
2. Fonts must not be sold as a standalone product.
3. Exact file bytes must continue to match the inventory SHA-256 pins (or the inventory/disposition must be updated together).
4. Changing a pin, source, or license requires re-running this disposition.

## 5. What this does **not** close

- Production ADR-0028 inventory for the Windows-first ship path is populated through evidence ops Slices 1–5 (Cargo closure in Slice 5); signing/multi-OS and explicit FOUNDATION-READY declaration remain separate
- Code signing / multi-OS production packaging certification
- Byte-for-byte reproducible signed release claims
- `FOUNDATION-READY` / `FOUNDATION-GOVERNANCE-READY` declaration

## 6. Inventory linkage

Machine-readable updates are in `docs/release-compliance/evidence-inventory.json`. Human-readable notices are in `docs/release-compliance/THIRD-PARTY-NOTICES.md`.
