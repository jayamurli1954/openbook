import test from 'node:test';
import * as assert from 'node:assert/strict';
import * as path from 'node:path';
import * as fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { EpubCheckSubprocessAdapter } from './epubcheck-adapter.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '../../..');

const spikeDir = path.join(rootDir, '.cache', 'spike');
const javaExe = process.platform === 'win32'
  ? path.join(spikeDir, 'temurin-21-minimal-runtime', 'bin', 'java.exe')
  : path.join(spikeDir, 'temurin-21-minimal-runtime', 'bin', 'java');
const epubcheckJar = path.join(spikeDir, 'epubcheck-5.3.0', 'epubcheck.jar');

const validEpub = path.join(rootDir, 'tests', 'fixtures', 'validation-spike', 'valid-minimal.epub');
const invalidEpub = path.join(rootDir, 'tests', 'fixtures', 'validation-spike', 'invalid-missing-nav.epub');

test('EpubCheckSubprocessAdapter interface & contract compliance', () => {
  const adapter = new EpubCheckSubprocessAdapter({
    javaExecutablePath: 'java',
    epubcheckJarPath: 'epubcheck.jar',
  });
  assert.ok(typeof adapter.validateEpub === 'function');
});

const hasSpikeRuntime = fs.existsSync(javaExe) && fs.existsSync(epubcheckJar) && fs.existsSync(validEpub);

test('Smoke test: validates minimal valid EPUB using bundled jlink runtime', { skip: !hasSpikeRuntime }, async () => {
  const adapter = new EpubCheckSubprocessAdapter({
    javaExecutablePath: javaExe,
    epubcheckJarPath: epubcheckJar,
  });

  const report = await adapter.validateEpub(validEpub);
  assert.equal(report.validatorName, 'EPUBCheck');
  assert.equal(report.validatorVersion, '5.3.0');
  assert.equal(report.isValid, true);
  assert.equal(report.rawExitCode, 0);
  assert.equal(report.summary.totalErrors, 0);
  assert.equal(report.summary.totalFatal, 0);
});

test('Smoke test: detects errors on malformed EPUB using bundled jlink runtime', { skip: !hasSpikeRuntime }, async () => {
  const adapter = new EpubCheckSubprocessAdapter({
    javaExecutablePath: javaExe,
    epubcheckJarPath: epubcheckJar,
  });

  const report = await adapter.validateEpub(invalidEpub);
  assert.equal(report.validatorName, 'EPUBCheck');
  assert.equal(report.validatorVersion, '5.3.0');
  assert.equal(report.isValid, false);
  assert.equal(report.rawExitCode, 1);
  assert.ok(report.summary.totalErrors > 0, 'Should report at least 1 error');
  assert.ok(report.messages.length > 0, 'Should have message entries');

  const ruleIds = report.messages.map((m) => m.id);
  assert.ok(ruleIds.includes('RSC-005') || ruleIds.includes('OPF-049'), 'Should identify missing nav or missing item rule violation');
});
