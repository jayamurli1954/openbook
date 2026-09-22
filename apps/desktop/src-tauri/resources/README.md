# Tauri application resources (Gate 10 / ADR-0032)

Staging root for packaged Gate 5/6 runtimes:

```text
resources/
  validator-runtime/   # EPUBCheck + jlink (from .cache/validator-runtime)
  pdf-runtime/         # Typst + fonts (from .cache/pdf-runtime)
  assembly-evidence.json
```

Binaries are **not** committed. Assemble on a Windows x64 host (or after
building Gate 5/6 caches with matching evidence):

```bash
npm run packaging:build -w @openbook/validator
npm run packaging:build -w @openbook/pdf
npm run packaging:assemble-windows-resources -w @openbook/desktop
```

Slice 2 verifies inventory checksums at packaging time. Slice 3 wires the
desktop host to resolve these paths. Slice 4 produces the installer.
