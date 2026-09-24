#!/usr/bin/env node
/**
 * Parse apps/desktop/src-tauri/Cargo.lock and attach license metadata.
 * Prefer cargo-metadata when available; fall back to crates.io API + cache.
 *
 * Evidence ops Slice 5 — see CARGO-PRODUCTION-INVENTORY-SLICE-5.md
 */
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

const ROOT = path.resolve(import.meta.dirname, "../..");
const TAURI_DIR = path.join(ROOT, "apps/desktop/src-tauri");
const LOCK_PATH = path.join(TAURI_DIR, "Cargo.lock");
const OUT_PATH = path.join(
  ROOT,
  "docs/release-compliance/cargo-production-closure-inventory.json",
);
const CACHE_PATH = path.join(
  ROOT,
  "docs/release-compliance/.cargo-license-cache.json",
);

const DIRECT_RUNTIME = new Set([
  "tauri",
  "tauri-plugin-sql",
  "tauri-plugin-dialog",
  "serde",
  "serde_json",
]);
const DIRECT_BUILD = new Set(["tauri-build"]);
const FIRST_PARTY = new Set(["openbook-desktop"]);

function parseCargoLock(text) {
  const packages = [];
  let cur = null;
  for (const line of text.split(/\r?\n/)) {
    if (line === "[[package]]") {
      if (cur) packages.push(cur);
      cur = { dependencies: [] };
      continue;
    }
    if (!cur) continue;
    const kv = line.match(/^(\w+)\s*=\s*"([^"]*)"$/);
    if (kv) {
      cur[kv[1]] = kv[2];
      continue;
    }
    if (line.trim() === "dependencies = [") {
      // collect until ]
      continue;
    }
  }
  if (cur) packages.push(cur);

  // Re-parse more carefully for dependencies arrays
  const blocks = text.split("[[package]]").slice(1);
  const out = [];
  for (const block of blocks) {
    const name = block.match(/^name = "([^"]+)"/m)?.[1];
    const version = block.match(/^version = "([^"]+)"/m)?.[1];
    const source = block.match(/^source = "([^"]+)"/m)?.[1];
    const checksum = block.match(/^checksum = "([^"]+)"/m)?.[1];
    if (!name || !version) continue;
    out.push({ name, version, source: source || null, checksum: checksum || null });
  }
  return out;
}

function normalizeLicense(license) {
  if (!license) return "unresolved";
  return String(license).trim();
}

function redistributionFor(license) {
  const l = license.toUpperCase();
  if (l === "UNRESOLVED") return "unresolved";
  if (l.includes("AGPL")) return "conditional";
  // Standalone MPL (not dual-licensed with MIT/Apache) is weak copyleft.
  if (l === "MPL-2.0" || l === "MPL-2.0+") return "conditional";
  if (l.includes("GPL") && !l.includes(" OR ") && !l.includes("/")) return "conditional";
  return "permitted";
}

function roleFor(name) {
  if (FIRST_PARTY.has(name)) return "first-party";
  if (DIRECT_RUNTIME.has(name)) return "direct";
  if (DIRECT_BUILD.has(name)) return "direct-build";
  return "transitive";
}

function loadCache() {
  try {
    return JSON.parse(fs.readFileSync(CACHE_PATH, "utf8"));
  } catch {
    return {};
  }
}

function saveCache(cache) {
  fs.writeFileSync(CACHE_PATH, `${JSON.stringify(cache, null, 2)}\n`);
}

async function fetchCratesIoLicense(name, version, cache) {
  const key = `${name}@${version}`;
  if (cache[key]) return cache[key];
  const url = `https://crates.io/api/v1/crates/${encodeURIComponent(name)}/${encodeURIComponent(version)}`;
  const res = await fetch(url, {
    headers: { "user-agent": "openbook-evidence-ops-slice-5 (github.com/jayamurli1954/openbook)" },
  });
  if (!res.ok) {
    cache[key] = { license: "unresolved", basis: `crates.io HTTP ${res.status}` };
    return cache[key];
  }
  const data = await res.json();
  const license = normalizeLicense(data.version?.license || data.crate?.license);
  cache[key] = {
    license,
    basis: "crates.io API version.license for locked version",
    crateIo: url,
  };
  return cache[key];
}

function tryCargoMetadata() {
  const r = spawnSync(
    "cargo",
    ["metadata", "--format-version", "1", "--manifest-path", path.join(TAURI_DIR, "Cargo.toml")],
    { encoding: "utf8", maxBuffer: 32 * 1024 * 1024 },
  );
  if (r.status !== 0) return null;
  try {
    return JSON.parse(r.stdout);
  } catch {
    return null;
  }
}

const packages = parseCargoLock(fs.readFileSync(LOCK_PATH, "utf8"));
const cache = loadCache();
const meta = tryCargoMetadata();
const licenseById = new Map();
if (meta?.packages) {
  for (const p of meta.packages) {
    licenseById.set(`${p.name}@${p.version}`, normalizeLicense(p.license || p.license_file || "unresolved"));
  }
}

const entries = [];
for (const p of packages.sort((a, b) => a.name.localeCompare(b.name) || a.version.localeCompare(b.version))) {
  const id = `${p.name}@${p.version}`;
  let license = licenseById.get(id) || "unresolved";
  let basis =
    license !== "unresolved"
      ? "cargo metadata license field for locked package"
      : "pending crates.io lookup";
  let licenseSource = license !== "unresolved" ? "cargo-metadata" : null;

  entries.push({
    component: p.name,
    version: p.version,
    classification: DIRECT_BUILD.has(p.name) ? "build" : "shipped-runtime",
    role: roleFor(p.name),
    status: "pending",
    provenance: {
      source: p.source || "path/local first-party",
      sourceReference: "apps/desktop/src-tauri/Cargo.lock",
      ...(p.checksum ? { integrity: `checksum:${p.checksum}` } : {}),
    },
    licensing: {
      license,
      basis,
      noticeRequired: !FIRST_PARTY.has(p.name),
      redistribution: FIRST_PARTY.has(p.name)
        ? "permitted"
        : DIRECT_BUILD.has(p.name)
          ? "not-applicable"
          : redistributionFor(license),
    },
    licenseSource,
  });
}

async function enrich() {
  const needFetch = entries.filter(
    (e) => e.licensing.license === "unresolved" && e.role !== "first-party" && e.provenance.source?.includes("crates.io"),
  );
  console.log(`packages=${entries.length}; need crates.io=${needFetch.length}; cargo-metadata=${meta ? "yes" : "no"}`);
  for (const e of needFetch) {
    const info = await fetchCratesIoLicense(e.component, e.version, cache);
    e.licensing.license = info.license;
    e.licensing.basis = info.basis;
    e.licensing.redistribution =
      e.classification === "build" ? "not-applicable" : redistributionFor(info.license);
    e.licenseSource = "crates.io";
    // polite rate limit
    await new Promise((r) => setTimeout(r, 120));
  }
  saveCache(cache);

  for (const e of entries) {
    if (e.role === "first-party") {
      e.licensing.license = "Apache-2.0";
      e.licensing.basis = "apps/desktop/src-tauri/Cargo.toml license field";
      e.status = "confirmed";
      e.licensing.redistribution = "permitted";
    } else if (e.licensing.license === "unresolved") {
      e.status = "unresolved";
    } else {
      e.status = "confirmed";
    }
  }

  const byLicense = entries.reduce((acc, e) => {
    acc[e.licensing.license] = (acc[e.licensing.license] || 0) + 1;
    return acc;
  }, {});

  const out = {
    schemaVersion: "1.0",
    inventoryKind: "cargo-production-closure-inventory",
    generatedFrom: {
      lockfile: "apps/desktop/src-tauri/Cargo.lock",
      manifest: "apps/desktop/src-tauri/Cargo.toml",
      method: "docs/release-compliance/CARGO-PRODUCTION-INVENTORY-SLICE-5.md",
      regenerator: "scripts/release-compliance/generate-cargo-production-closure.mjs",
      licenseSource: meta ? "cargo-metadata-primary" : "crates.io-fallback",
      directRuntime: [...DIRECT_RUNTIME],
      directBuild: [...DIRECT_BUILD],
    },
    summary: {
      total: entries.length,
      firstParty: entries.filter((e) => e.role === "first-party").length,
      direct: entries.filter((e) => e.role === "direct").length,
      directBuild: entries.filter((e) => e.role === "direct-build").length,
      transitive: entries.filter((e) => e.role === "transitive").length,
      confirmed: entries.filter((e) => e.status === "confirmed").length,
      unresolved: entries.filter((e) => e.status === "unresolved").length,
      byLicense,
    },
    entries,
  };

  fs.writeFileSync(OUT_PATH, `${JSON.stringify(out, null, 2)}\n`);
  console.log(`Wrote ${OUT_PATH}`);
  console.log(JSON.stringify(out.summary, null, 2));
  if (out.summary.unresolved) {
    console.log(
      "unresolved:",
      out.entries.filter((e) => e.status === "unresolved").map((e) => `${e.component}@${e.version}`),
    );
  }
}

await enrich();
