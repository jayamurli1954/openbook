# Gate 5 Platform Packaging Evidence

Per ADR-0012, a platform is **production-supported** only after:

1. native `jlink` image build for that OS/arch;
2. checksum record of ingested EPUBCheck + Temurin artifacts;
3. EPUBCheck 5.3.0 valid + invalid smoke tests on that platform.

Pinned artifacts are in `inventory.json`. Local/CI builds write machine evidence to:

```text
.cache/validator-runtime/build-evidence.json
```

(that path is gitignored).

## Evidence matrix

| Platform key | Artifact pin | Smoke evidence in this PR |
| --- | --- | --- |
| `windows-x64` | Temurin `jdk-21.0.12.1+1` zip SHA-256 `f9d6e191…8b4e` | Recorded below (implementation host) |
| `linux-x64` | Temurin `jdk-21.0.12.1+1` tar.gz SHA-256 `ce79869e…ee94` | CI job `validator-runtime` on `ubuntu-latest` |
| `linux-aarch64` | Temurin `jdk-21.0.12.1+1` tar.gz SHA-256 `23e37e02…e223` | Packaging supported; native smoke pending dedicated runner |
| `mac-x64` | Temurin `jdk-21.0.12.1+1` tar.gz SHA-256 `44db0f08…42ce` | Packaging supported; native smoke pending dedicated runner |
| `mac-aarch64` | Temurin `jdk-21.0.12.1+1` tar.gz SHA-256 `3623232f…9998` | Packaging supported; native smoke pending dedicated runner |

## Windows x64 evidence (implementation host)

- Built at: `2026-09-08T04:21:12.588Z`
- EPUBCheck 5.3.0 zip SHA-256: `6c07e68584b2e2ce2f89fe06e1246dfead3eb36b46b340e7d93524f29dcff6c5`
- Temurin release: `jdk-21.0.12.1+1` (`21.0.12.1+1-LTS`)
- Temurin Windows x64 zip SHA-256: `f9d6e191ab098c0d416e7d588a24420a8621cd2f4720dab2459b8b7b2d2d8b4e`
- jlink runtime size: `61936060` bytes (59.07 MiB)
- Full JDK size (build input): `343823876` bytes
- jlink modules: see `inventory.json` → `jlink.modules`
- Builder: `npm run packaging:build -w @openbook/validator`
- Smoke: Gate 5 `@openbook/validator` tests — valid EPUB `isValid=true` / invalid EPUB `failureKind=conformance`

## Linux x64 evidence (CI)

GitHub Actions workflow job `validator-runtime` runs the same packaging builder and Gate 5 smoke tests on `ubuntu-latest`.
