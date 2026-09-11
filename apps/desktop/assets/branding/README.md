# OpenBook Studio — Desktop Application Branding Asset

## Overview

This directory contains the proposed canonical master source artwork for the **OpenBook Studio** desktop application icon, created in accordance with [`THIRD_PARTY_TRADEMARK_AND_BRAND_POLICY.md`](../../../../THIRD_PARTY_TRADEMARK_AND_BRAND_POLICY.md).

## Asset Specifications

* **File:** `openbook-app-icon-1024.png`
* **Dimensions:** 1024 × 1024 pixels
* **Format:** 32-bit RGBA PNG (lossless, sRGB, true alpha transparency)
* **Design Motif:** Candidate 1 — Geometric Open Book (simplified architectural silhouette with dual open pages, central spine binding, and balanced 12% safe padding margin).
* **Color Palette:**
  * **Deep Navy:** `#162640` (RGB: `22, 38, 64`) — Outer binding, outlines, spine divider
  * **Warm Amber (Lit):** `#F4AA32` (RGB: `244, 170, 50`) — Right page upper face
  * **Warm Amber (Shadow):** `#D4861E` (RGB: `212, 134, 30`) — Right page fold facet
  * **Amber Cover Flap:** `#E5A237` (RGB: `229, 162, 55`) — Base cover flaps and spine notch
  * **Paper White (Lit):** `#FFFFFF` (RGB: `255, 255, 255`) — Left page lit face
  * **Paper Shadow:** `#DCE2EB` (RGB: `220, 226, 235`) — Left page fold facet
  * **Secondary Page Rim:** `#F8FAFC` (RGB: `248, 250, 252`) — Background page layer

## Provenance & Rights Status

* **Creation Method:** AI-assisted design generation and refinement performed during OpenBook Studio development.
* **Design Direction:** Maintainer-approved Candidate 1 — Geometric Open Book.
* **Human/Project Steward:** SanMitra Tech Solutions / OpenBook project maintainer.
* **Creation Date:** 2026-09-10
* **Rights Status:** Intended for use as OpenBook Studio branding. Final ownership, licensing, and commercial-distribution status must be confirmed by the project steward before release.
* **Third-Party Branding Review:** The asset was reviewed against the OpenBook Third-Party Trademark & Brand-Asset Policy and contains no intentionally incorporated third-party logos, vendor marks, or format-specific symbols.

## Platform Packaging Tooling

When implementation is authorized, the derived multi-format packaging icons in `apps/desktop/src-tauri/icons/` will be generated from this master asset using the official Tauri CLI:

```bash
npx @tauri-apps/cli icon apps/desktop/assets/branding/openbook-app-icon-1024.png --output apps/desktop/src-tauri/icons
```
