#!/usr/bin/env node
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';
import { spawnSync } from 'node:child_process';

const root = resolve(import.meta.dirname, '..');
const workspace = mkdtempSync(resolve(tmpdir(), 'place-files-init-'));

function fail(message) {
  throw new Error(`[init test] ${message}`);
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
  console.log('[init test] generate simple preset');
  const output = runCli(['init', '--cwd', workspace]);
  assert(output.includes('[place-files] wrote simple preset:'), 'expected init success output');
  assert(readFileSync(resolve(workspace, 'place-files.version'), 'utf8') === 'simple-v1\n', 'expected version file');
  assert(
    readFileSync(resolve(workspace, 'place-files-payload/hello.txt'), 'utf8') === 'Hello from place-files.\n',
    'expected payload file',
  );
  assert(
    readFileSync(resolve(workspace, 'place-files.yml'), 'utf8').includes('dst: output/hello.txt'),
    'expected config file',
  );

  console.log('[init test] show dry-run overwrite plan');
  const dryRunOutput = runCli(['init', '--cwd', workspace, '--dry-run']);
  assert(dryRunOutput.includes('[overwrite] place-files.yml'), 'expected dry-run overwrite plan');

  console.log('[init test] refuse overwrite without force');
  runCli(['init', '--cwd', workspace], 1);

  console.log('[init test] overwrite with force');
  writeFileSync(resolve(workspace, 'place-files.version'), 'changed\n', 'utf8');
  runCli(['init', 'simple', '--cwd', workspace, '--force']);
  assert(readFileSync(resolve(workspace, 'place-files.version'), 'utf8') === 'simple-v1\n', 'expected forced overwrite');

  console.log('[init test] passed');
} finally {
  rmSync(workspace, { recursive: true, force: true });
}
