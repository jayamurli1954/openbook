# Gate 6 PDF runtime packaging

Build-time packaging for **Typst v0.15.1** and bundled OFL fonts (ADR-0013).

## Build

```bash
npm run packaging:build -w @openbook/pdf
```

Writes under `.cache/pdf-runtime/` (gitignored):

- `typst/` — extracted Typst CLI for the host platform
- `fonts/` — checksum-pinned Noto Serif/Sans (+ Kannada) fonts
- `build-evidence.json` — version, SHA-256, paths

Application runtime **never downloads** Typst or fonts. Resolve via `resolveProductionTypstRuntime()` or `OPENBOOK_PDF_RUNTIME_ROOT`.

## Pins

See `inventory.json` for exact Typst artifact SHA-256 values and font file hashes.

## Notices

See `THIRD-PARTY-NOTICES.md`.
