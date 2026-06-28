#!/usr/bin/env node
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const workspace = mkdtempSync(resolve(tmpdir(), 'place-files-glob-behavior-'));

function fail(message) {
  throw new Error(`[glob-behavior test] ${message}`);
}

function assert(condition, message) {
  if (!condition) {
    fail(message);
  }
}

function runCli(configPath) {
  const result = spawnSync(process.execPath, ['dist/cli.js', '--config', configPath, '--verbose'], {
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
    fail(`expected status 0, got ${result.status}`);
  }

  return `${result.stdout ?? ''}${result.stderr ?? ''}`;
}

function writeFixture(name, behaviorConfig) {
  const fixture = resolve(workspace, name);
  mkdirSync(resolve(fixture, 'SOME/nested'), { recursive: true });
  writeFileSync(resolve(fixture, 'place-files.version'), `${name}-v1\n`, 'utf8');
  writeFileSync(resolve(fixture, 'SOME/nested/file.txt'), `${name} nested file\n`, 'utf8');
  writeFileSync(resolve(fixture, 'place-files.yml'), `base_dir: .
version_file: place-files.version
applied_version_file: .place-files.applied.version

entries:
  - src: ${name === 'preserve' ? 'SOME/**' : 'SOME/**/*.txt'}
    dst: output

backup:
  enabled: false

behavior:
  fail_on_missing_source: true
${behaviorConfig}`, 'utf8');

  return fixture;
}

try {
  console.log('[glob-behavior test] default preserved recursive glob');
  const preserveFixture = writeFixture('preserve', '');
  const preserveOutput = runCli(resolve(preserveFixture, 'place-files.yml'));
  const preserveCopyLines = preserveOutput.split('\n').filter((line) => line.includes('[copy]'));

  assert(preserveCopyLines.length === 1, `expected 1 pruned copy, got ${preserveCopyLines.length}`);
  assert(
    readFileSync(resolve(preserveFixture, 'output/SOME/nested/file.txt'), 'utf8') === 'preserve nested file\n',
    'expected nested file under preserved SOME path',
  );
  assert(!existsSync(resolve(preserveFixture, 'output/file.txt')), 'did not expect flattened output/file.txt');

  console.log('[glob-behavior test] flatten glob mode');
  const flattenFixture = writeFixture('flatten', '  preserve_glob_paths: false\n');
  runCli(resolve(flattenFixture, 'place-files.yml'));

  assert(
    readFileSync(resolve(flattenFixture, 'output/file.txt'), 'utf8') === 'flatten nested file\n',
    'expected flattened output/file.txt',
  );
  assert(
    !existsSync(resolve(flattenFixture, 'output/SOME/nested/file.txt')),
    'did not expect preserved nested path in flatten mode',
  );

  console.log('[glob-behavior test] passed');
} finally {
  rmSync(workspace, { recursive: true, force: true });
}
