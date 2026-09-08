# Third-party notices — `@openbook/pdf` Gate 6 runtime

## Typst CLI v0.15.1

- **Project:** Typst
- **License:** Apache License 2.0
- **Source:** https://github.com/typst/typst
- **Release:** https://github.com/typst/typst/releases/tag/v0.15.1
- **Git commit (ADR-0013):** `9dfd3a08`

Upstream `LICENSE` / `NOTICE` from the Typst project apply to redistributed binaries.
Pinned platform archives and SHA-256 digests are recorded in `inventory.json`.

## Bundled fonts (SIL Open Font License 1.1)

| Font | Role | Upstream |
| --- | --- | --- |
| Noto Serif Kannada | Body (Kannada) | https://github.com/google/fonts (ofl/notoserifkannada) |
| Noto Sans Kannada | Headings (Kannada) | https://github.com/google/fonts (ofl/notosanskannada) |
| Noto Serif | Body (Latin fallback) | https://github.com/google/fonts (ofl/notoserif) |
| Noto Sans | Headings (Latin fallback) | https://github.com/google/fonts (ofl/notosans) |

Each font family is distributed under the **SIL Open Font License 1.1**. Packaging extracts the corresponding `OFL.txt` beside the font files when available.

Checksums for the exact font files used by OpenBook are recorded in `inventory.json`.
