#!/usr/bin/env node
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const workspace = mkdtempSync(resolve(tmpdir(), 'place-files-backup-format-'));

function fail(message) {
  throw new Error(`[backup-format test] ${message}`);
}

function assert(condition, message) {
  if (!condition) {
    fail(message);
  }
}

function runCli(args, expectStatus = 0) {
  const result = spawnSync(process.execPath, ['dist/cli.js', ...args], {
    cwd: root,
    encoding: 'utf8',
  });

  if (result.stdout) {
    process.stdout.write(result.stdout);
  }
  if (result.stderr) {
    process.stderr.write(result.stderr);
  }

  if (result.status !== expectStatus) {
    fail(`expected status ${expectStatus}, got ${result.status}`);
  }

  return `${result.stdout ?? ''}${result.stderr ?? ''}`;
}

try {
  console.log('[backup-format test] create fixture');
  mkdirSync(resolve(workspace, 'payload'), { recursive: true });
  mkdirSync(resolve(workspace, 'output/config'), { recursive: true });
  writeFileSync(resolve(workspace, 'place-files.version'), 'new-version\n', 'utf8');
  writeFileSync(resolve(workspace, '.place-files.applied.version'), 'old-version\n', 'utf8');
  writeFileSync(resolve(workspace, 'payload/app.json'), '{"source":true}\n', 'utf8');
  writeFileSync(resolve(workspace, 'output/config/app.json'), '{"stale":true}\n', 'utf8');
  writeFileSync(resolve(workspace, 'place-files.yml'), `base_dir: .
version_file: place-files.version
applied_version_file: .place-files.applied.version

entries:
  - src: payload/app.json
    dst: output/config/app.json

backup:
  enabled: true
  directory: backups
  format: '{target_dir}/{name}-{previous_version}{ext}.bak'
  include_previous_version: true
`, 'utf8');

  console.log('[backup-format test] apply');
  runCli(['--config', resolve(workspace, 'place-files.yml')]);

  const backupPath = resolve(workspace, 'backups/output/config/app-old-version.json.bak');
  assert(existsSync(backupPath), `expected formatted backup at ${backupPath}`);
  assert(readFileSync(backupPath, 'utf8') === '{"stale":true}\n', 'expected stale target in backup');
  assert(
    readFileSync(resolve(workspace, 'output/config/app.json'), 'utf8') === '{"source":true}\n',
    'expected source file copied to target',
  );

  console.log('[backup-format test] passed');
} finally {
  rmSync(workspace, { recursive: true, force: true });
}
