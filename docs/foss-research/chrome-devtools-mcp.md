# FOSS research: chrome-devtools-mcp

**Project:** [ChromeDevTools/chrome-devtools-mcp](https://github.com/ChromeDevTools/chrome-devtools-mcp)  
**Reviewed:** 2026-09-03  
**License (research):** Apache-2.0 — re-verify at any adoption  
**Classification:** **USE** (Cursor / coding-agent toolchain only) · **AVOID** as an OpenBook product/EMBED dependency  
**Legal review required:** No for agent-side USE; yes if we ever ship it with OpenBook

## What it is

An MCP server that lets a coding agent (Cursor, Copilot, etc.) drive a live **Google Chrome** instance via Chrome DevTools + Puppeteer: screenshots, console, network, performance traces, click/type automation.

It is a **developer-agent tool**, not a publishing library.

## Helpful for OpenBook when

- Phase 1+ **HTML / reflowable preview** is running in a browser and we need visual/console/a11y debugging.
- Checking that generated HTML/CSS does not dump errors in the console.
- Later **web** reuse of domain packages (architecture allows a future web client that must not force desktop onto the cloud).

## Not helpful for OpenBook now

- There is no application UI yet (`FOUNDATION-READY` not passed).
- Desktop shell is **Tauri**, not Chrome. This MCP talks to Chrome, not the Tauri WebView.
- It does not implement Book Model, EPUB, PDF, EPUBCheck, or DTP.
- Default telemetry sends usage stats to Google; `--no-usage-statistics` / `CI` to opt out. Browser contents are exposed to the MCP client — do not point it at user manuscripts.

## Decision

Do **not** add `chrome-devtools-mcp` to the OpenBook repository, `package.json`, or architecture baseline.

Optional later: developers and Cursor Cloud Agents may **USE** it locally (or in CI with telemetry off) to inspect HTML preview. Product EPUB validation remains EPUBCheck. Product preview remains the architecture preview pipeline, not Chrome-as-source-of-truth.
