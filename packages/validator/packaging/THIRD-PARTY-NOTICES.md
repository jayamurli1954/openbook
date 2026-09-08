# OpenBook Validator — Third-Party Notices (Gate 5)

OpenBook application code remains **Apache-2.0**.

This package redistributes (or builds local caches of) third-party components for EPUB conformance validation. Redistribution does **not** relicense those components as Apache-2.0.

## Official EPUBCheck 5.3.0

- **Project:** W3C EPUBCheck (DAISY Consortium on behalf of W3C)
- **Version:** 5.3.0
- **Artifact:** `epubcheck-5.3.0.zip`
- **SHA-256:** `6c07e68584b2e2ce2f89fe06e1246dfead3eb36b46b340e7d93524f29dcff6c5`
- **Primary license:** BSD-3-Clause
- **Notices:** Upstream `LICENSE.txt`, `THIRD-PARTY.txt`, and `licenses/` from the official distribution must be preserved beside the packaged JAR when shipping.

Transitive components inside the EPUBCheck distribution include (non-exhaustive; see upstream `THIRD-PARTY.txt`):

- Saxon-HE (MPL-2.0)
- Jing (BSD-3-Clause)
- Xerces / XML APIs (Apache-2.0 / W3C)
- Guava, Commons Compress/IO/Codec/Lang (Apache-2.0)
- SLF4J (MIT)
- ICU4J and related libraries (per upstream notices)

## Eclipse Temurin 21 LTS (OpenJDK)

- **Vendor:** Eclipse Adoptium — Eclipse Temurin
- **Pinned release:** `jdk-21.0.12.1+1` (`21.0.12.1+1-LTS`)
- **License:** GPLv2 with Classpath Exception
- **Packaging:** private `jlink` custom runtime image (not a full JDK ship by default)
- **Notices:** Temurin `LICENSE`, `ASSEMBLY_EXCEPTION`, and `legal/` tree from the built runtime image must be preserved when shipping.

Exact per-platform download URLs and SHA-256 digests are recorded in `inventory.json`.

## Isolation note

OpenBook invokes EPUBCheck through an isolated subprocess (`EpubCheckSubprocessAdapter`). Architectural isolation does not waive redistribution or notice obligations for bundled artifacts.

## Regeneration

When EPUBCheck or Temurin pins change (release-governance event):

1. Update `inventory.json` hashes/URLs.
2. Rebuild platform runtime images via `npm run packaging:build -w @openbook/validator`.
3. Refresh notices from upstream archives.
4. Re-run Gate 5 smoke fixtures and full regression.
