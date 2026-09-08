# Gate 5 Validator Runtime Packaging

Production EPUBCheck runtime packaging for `@openbook/validator` per **ADR-0012**.

## What this builds

```text
Official EPUBCheck 5.3.0 (checksum-pinned)
        +
Eclipse Temurin 21.0.12.1+1 (checksum-pinned)
        ↓ jlink
.cache/validator-runtime/runtime/   (minimized private Java image)
.cache/validator-runtime/epubcheck-5.3.0/
.cache/validator-runtime/build-evidence.json
```

Runtime binaries are **not** committed. They are produced locally/CI by the packaging script.

## Commands

```bash
# Download, verify SHA-256, extract EPUBCheck, jlink Temurin for this host
npm run packaging:build -w @openbook/validator

# Run Gate 5 tests (requires built runtime)
npm test -w @openbook/validator
```

Environment override:

```bash
OPENBOOK_VALIDATOR_RUNTIME_ROOT=/absolute/path/to/.cache/validator-runtime
```

## Platform matrix

| Platform key | Smoke evidence required before “production-supported” |
| --- | --- |
| `windows-x64` | native jlink + valid/invalid EPUBCheck |
| `linux-x64` | native jlink + valid/invalid EPUBCheck |
| `linux-aarch64` | native jlink + valid/invalid EPUBCheck |
| `mac-x64` | native jlink + valid/invalid EPUBCheck |
| `mac-aarch64` | native jlink + valid/invalid EPUBCheck |

See `PLATFORM-EVIDENCE.md` and `inventory.json`.
