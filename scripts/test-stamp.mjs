#!/usr/bin/env node
import { spawnSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const testbed = resolve(root, 'examples/testbed');
const sourceVersionPath = resolve(testbed, 'source/place-files.version');
const mutableSourcePath = resolve(testbed, 'source/assets/banner.txt');
const originalVersionContent = readFileSync(sourceVersionPath, 'utf8');
const originalSourceContent = readFileSync(mutableSourcePath, 'utf8');

function fail(message) {
  throw new Error(`[stamp test] ${message}`);
}

function assert(condition, message) {
  if (!condition) {
    fail(message);
  }
}

function runStamp(extraArgs = []) {
  const result = spawnSync(process.execPath, [
    'dist/cli.js',
    'stamp',
    '--config',
    'examples/testbed/place-files.yml',
    ...extraArgs,
  ], {
    cwd: root,
    encoding: 'utf8',
  });

  if (result.stdout) {
    process.stdout.write(result.stdout);
  }
  if (result.stderr) {
    process.stderr.write(result.stderr);
  }

  if (result.status !== 0) {
    fail(`stamp exited with status ${result.status}`);
  }

  return `${result.stdout ?? ''}${result.stderr ?? ''}`;
}

function readVersion() {
  return readFileSync(sourceVersionPath, 'utf8').trim();
}

try {
  console.log('[stamp test] reset testbed');
  const reset = spawnSync(process.execPath, ['scripts/reset-testbed.mjs'], { cwd: root, encoding: 'utf8' });
  if (reset.status !== 0) {
    fail('reset-testbed.mjs failed');
  }

  console.log('[stamp test] first stamp updates the version file');
  const firstOutput = runStamp();
  const firstHash = readVersion();
  assert(firstOutput.includes('[place-files] updated'), 'expected the first stamp to update the version file');
  assert(/^[0-9a-f]{64}$/.test(firstHash), `expected a sha256 hash in the version file, got ${firstHash}`);
  assert(firstHash !== originalVersionContent.trim(), 'expected the hash to differ from the preset version');

  console.log('[stamp test] second stamp is idempotent');
  const secondOutput = runStamp();
  assert(secondOutput.includes('version file is up to date'), 'expected the second stamp to be a no-op');
  assert(readVersion() === firstHash, 'expected the version file to stay unchanged');

  console.log('[stamp test] source content change produces a new hash');
  writeFileSync(mutableSourcePath, `${originalSourceContent}stamp test mutation\n`, 'utf8');
  const thirdOutput = runStamp();
  const secondHash = readVersion();
  assert(thirdOutput.includes('[place-files] updated'), 'expected stamp to update after a source change');
  assert(secondHash !== firstHash, 'expected a different hash after a source change');

  console.log('[stamp test] restoring the source restores the original hash');
  writeFileSync(mutableSourcePath, originalSourceContent, 'utf8');
  runStamp();
  assert(readVersion() === firstHash, 'expected the hash to return to the first value (deterministic scan)');

  console.log('[stamp test] dry-run reports without writing');
  writeFileSync(mutableSourcePath, `${originalSourceContent}stamp test dry-run mutation\n`, 'utf8');
  const dryRunOutput = runStamp(['--dry-run']);
  assert(dryRunOutput.includes('would update'), 'expected dry-run to report a pending update');
  assert(readVersion() === firstHash, 'expected dry-run to leave the version file untouched');

  console.log('[stamp test] passed');
} finally {
  writeFileSync(mutableSourcePath, originalSourceContent, 'utf8');
  writeFileSync(sourceVersionPath, originalVersionContent, 'utf8');
}
