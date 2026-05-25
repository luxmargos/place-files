#!/usr/bin/env node
import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const testbed = resolve(root, 'examples/testbed');
const sourceVersionPath = resolve(testbed, 'source/place-files.version');
const appliedVersionPath = resolve(testbed, 'workdir/.place-files.applied.version');
const backupDir = resolve(testbed, 'workdir/.place-files-backups');
const localOnlyConfigPath = resolve(testbed, 'workdir/config/local-only.json');
const originalSourceVersionContent = readFileSync(sourceVersionPath, 'utf8');
const originalVersion = originalSourceVersionContent.trim();
const nextVersion = `${originalVersion}-version-up-test`;

function fail(message) {
  throw new Error(`[version-up test] ${message}`);
}

function assert(condition, message) {
  if (!condition) {
    fail(message);
  }
}

function runNode(args) {
  const result = spawnSync(process.execPath, args, {
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
    fail(`${process.execPath} ${args.join(' ')} exited with status ${result.status}`);
  }

  return `${result.stdout ?? ''}${result.stderr ?? ''}`;
}

function runPlaceFiles() {
  return runNode([
    'dist/cli.js',
    '--config',
    'examples/testbed/place-files.yml',
    '--verbose',
  ]);
}

function listBackupNames() {
  if (!existsSync(backupDir)) {
    return [];
  }

  return readdirSync(backupDir).sort();
}

try {
  console.log('[version-up test] reset testbed');
  runNode(['scripts/reset-testbed.mjs']);

  console.log('[version-up test] initial apply');
  runPlaceFiles();

  const appliedAfterInitialRun = readFileSync(appliedVersionPath, 'utf8').trim();
  assert(
    appliedAfterInitialRun === originalVersion,
    `expected initial applied version ${originalVersion}, got ${appliedAfterInitialRun}`,
  );

  const backupsAfterInitialRun = listBackupNames();
  assert(
    backupsAfterInitialRun.length === 3,
    `expected 3 initial backups, got ${backupsAfterInitialRun.length}`,
  );

  console.log(`[version-up test] bump source version to ${nextVersion}`);
  writeFileSync(sourceVersionPath, `${nextVersion}\n`, 'utf8');

  console.log('[version-up test] apply after version-up');
  const versionUpOutput = runPlaceFiles();

  assert(
    versionUpOutput.includes(`[place-files] starting (version: ${nextVersion})`),
    'expected the second apply to run with the bumped source version',
  );

  const appliedAfterVersionUp = readFileSync(appliedVersionPath, 'utf8').trim();
  assert(
    appliedAfterVersionUp === nextVersion,
    `expected applied version ${nextVersion}, got ${appliedAfterVersionUp}`,
  );

  const backupsAfterVersionUp = listBackupNames();
  const newBackupCount = backupsAfterVersionUp.length - backupsAfterInitialRun.length;
  assert(
    newBackupCount === 4,
    `expected 4 new backups after version-up, got ${newBackupCount}`,
  );

  const previousVersionBackupCount = backupsAfterVersionUp
    .filter((name) => name.endsWith(`_version-${originalVersion}.backup`))
    .length;
  assert(
    previousVersionBackupCount === 4,
    `expected 4 backups tagged with previous version ${originalVersion}, got ${previousVersionBackupCount}`,
  );

  assert(existsSync(localOnlyConfigPath), 'expected unmanaged local-only config to remain in place');

  console.log('[version-up test] passed');
} finally {
  writeFileSync(sourceVersionPath, originalSourceVersionContent, 'utf8');
}
