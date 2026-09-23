#!/usr/bin/env node
/**
 * Regenerate docs/release-compliance/npm-production-closure-inventory.json
 * from package-lock.json for the desktop production dependency roots.
 *
 * Evidence ops Slice 4 — see NPM-TRANSITIVE-PRODUCTION-INVENTORY-SLICE-4.md
 */
import fs from "node:fs";
import path from "node:path";

const ROOT = path.resolve(import.meta.dirname, "../..");
const LOCK_PATH = path.join(ROOT, "package-lock.json");
const OUT_PATH = path.join(
  ROOT,
  "docs/release-compliance/npm-production-closure-inventory.json",
);

const ROOTS = [
  "react",
  "react-dom",
  "@tiptap/core",
  "@tiptap/react",
  "@tiptap/pm",
  "@tiptap/starter-kit",
  "@tiptap/extension-link",
  "@tauri-apps/api",
  "@tauri-apps/plugin-dialog",
  "@tauri-apps/plugin-sql",
  "fflate",
  "markdown-it",
];

function packageKey(name) {
  return `node_modules/${name}`;
}

function normalizeLicense(license) {
  if (!license) return "unresolved";
  if (typeof license === "object" && license.type) return String(license.type);
  return String(license);
}

function redistributionFor(license) {
  const l = license.toUpperCase();
  if (l.includes("GPL") && !l.includes("CLASSPATH")) return "conditional";
  if (l.includes("PYTHON-2.0") || l === "PYTHON-2.0") return "conditional";
  if (l === "UNRESOLVED") return "unresolved";
  return "permitted";
}

const lock = JSON.parse(fs.readFileSync(LOCK_PATH, "utf8"));
const pkgs = lock.packages || {};
const direct = new Set(ROOTS);
const seen = new Set();
const queue = [...ROOTS];

while (queue.length) {
  const name = queue.shift();
  if (seen.has(name)) continue;
  seen.add(name);
  const entry = pkgs[packageKey(name)];
  if (!entry) continue;
  const deps = {
    ...(entry.dependencies || {}),
    ...(entry.optionalDependencies || {}),
  };
  for (const dep of Object.keys(deps)) {
    if (pkgs[packageKey(dep)]) queue.push(dep);
  }
}

const entries = [];
for (const name of [...seen].sort()) {
  const entry = pkgs[packageKey(name)];
  if (!entry || entry.link) continue;
  const pkgJsonPath = path.join(ROOT, packageKey(name), "package.json");
  const pkgJson = JSON.parse(fs.readFileSync(pkgJsonPath, "utf8"));
  const license = normalizeLicense(pkgJson.license);
  const files = fs
    .readdirSync(path.join(ROOT, packageKey(name)))
    .filter((f) => /^licen[cs]e/i.test(f));
  const licenseFile = files[0]
    ? `${packageKey(name)}/${files[0]}`
    : null;
  entries.push({
    component: name,
    version: entry.version,
    classification: "shipped-runtime",
    role: direct.has(name) ? "direct" : "transitive",
    status: license === "unresolved" || !licenseFile ? "unresolved" : "confirmed",
    provenance: {
      source: entry.resolved || `https://registry.npmjs.org/${name}`,
      sourceReference: "package-lock.json",
      ...(entry.integrity ? { integrity: entry.integrity } : {}),
    },
    licensing: {
      license,
      basis:
        "Published package.json license + LICENSE* in installed package tree; NPM-TRANSITIVE-PRODUCTION-INVENTORY-SLICE-4.md",
      noticeRequired: true,
      redistribution: redistributionFor(license),
    },
    licenseFile,
  });
}

const byLicense = entries.reduce((acc, e) => {
  acc[e.licensing.license] = (acc[e.licensing.license] || 0) + 1;
  return acc;
}, {});

const out = {
  schemaVersion: "1.0",
  inventoryKind: "npm-production-closure-inventory",
  generatedFrom: {
    lockfile: "package-lock.json",
    lockfileVersion: lock.lockfileVersion,
    method: "docs/release-compliance/NPM-TRANSITIVE-PRODUCTION-INVENTORY-SLICE-4.md",
    regenerator: "scripts/release-compliance/generate-npm-production-closure.mjs",
    roots: ROOTS,
  },
  summary: {
    total: entries.length,
    direct: entries.filter((e) => e.role === "direct").length,
    transitive: entries.filter((e) => e.role === "transitive").length,
    confirmed: entries.filter((e) => e.status === "confirmed").length,
    unresolved: entries.filter((e) => e.status === "unresolved").length,
    byLicense,
  },
  entries,
};

fs.writeFileSync(OUT_PATH, `${JSON.stringify(out, null, 2)}\n`);
console.log(
  `Wrote ${OUT_PATH} (${out.summary.total} packages; ${out.summary.transitive} transitive)`,
);
