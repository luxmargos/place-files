import { createHash } from 'node:crypto';
import { existsSync, globSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join, relative, resolve, sep } from 'node:path';
import { loadConfig } from './config.js';
import { isGlobPattern, resolveFromBase } from './path-utils.js';
import type { NormalizedPlaceFilesConfig, StampVersionOptions, StampVersionResult } from './types.js';

export function stampVersion(options: StampVersionOptions): StampVersionResult {
  const config = loadConfig(options.configPath);
  const verbose = options.verbose ?? false;
  const versionFilePath = resolveFromBase(config.baseDir, config.versionFile);
  const appliedVersionFilePath = resolveFromBase(config.baseDir, config.appliedVersionFile);

  // The config participates in the version so semantic config changes (entries,
  // backup options, behavior) also produce a new hash. It contributes a
  // fingerprint of its normalized settings instead of its raw bytes, so cosmetic
  // edits (comments, whitespace, key order, line endings) never trigger a
  // re-place, and it is excluded from source collection so a config file inside
  // a source tree is never double-counted.
  const files = collectSourceFiles(config, [versionFilePath, appliedVersionFilePath, config.configPath]);
  const hash = hashSourceFiles(config, files, verbose);
  const previousHash = readVersion(versionFilePath);
  const changed = previousHash !== hash;

  if (changed && !options.dryRun) {
    mkdirSync(dirname(versionFilePath), { recursive: true });
    writeFileSync(versionFilePath, `${hash}\n`, 'utf8');
  }

  return {
    changed,
    hash,
    previousHash,
    fileCount: files.length,
    versionFilePath,
  };
}

function collectSourceFiles(config: NormalizedPlaceFilesConfig, excludePaths: string[]): string[] {
  const found = new Set<string>();
  const excluded = new Set(excludePaths.map((path) => resolve(path)));

  for (const entry of config.entries) {
    if (isGlobPattern(entry.src)) {
      const matched = globSync(entry.src, { cwd: config.baseDir });
      if (matched.length === 0) {
        handleMissingSource(`no matches: ${entry.src}`, config);
        continue;
      }
      for (const match of matched) {
        addPath(resolve(config.baseDir, match), found, excluded);
      }
      continue;
    }

    const srcPath = resolveFromBase(config.baseDir, entry.src);
    if (!existsSync(srcPath)) {
      handleMissingSource(`source not found: ${entry.src}`, config);
      continue;
    }
    addPath(srcPath, found, excluded);
  }

  return [...found];
}

function addPath(path: string, found: Set<string>, excluded: Set<string>): void {
  if (excluded.has(path)) {
    return;
  }
  const stat = statSync(path);
  if (stat.isDirectory()) {
    walkDirectory(path, found, excluded);
    return;
  }
  if (stat.isFile()) {
    found.add(path);
  }
}

function walkDirectory(directory: string, found: Set<string>, excluded: Set<string>): void {
  for (const name of readdirSync(directory).sort()) {
    const path = join(directory, name);
    if (excluded.has(path)) {
      continue;
    }
    const stat = statSync(path);
    if (stat.isDirectory()) {
      walkDirectory(path, found, excluded);
    } else if (stat.isFile()) {
      found.add(path);
    }
  }
}

function hashSourceFiles(config: NormalizedPlaceFilesConfig, files: string[], verbose: boolean): string {
  // Build a manifest of "<content hash>  <relative posix path>" lines and sort it
  // with the default code-unit order so the result is stable across OS, filesystem,
  // locale, and scan order. Absolute paths and timestamps never enter the hash.
  const configLine = `${hashConfigFingerprint(config)}  ${relative(config.baseDir, config.configPath).split(sep).join('/')}`;
  const manifest = [
    ...files.map((filePath) => {
      const relativePath = relative(config.baseDir, filePath).split(sep).join('/');
      const contentHash = createHash('sha256').update(readFileSync(filePath)).digest('hex');
      return `${contentHash}  ${relativePath}`;
    }),
    configLine,
  ].sort();

  if (verbose) {
    for (const line of manifest) {
      log(`  [hash] ${line}`);
    }
  }

  return createHash('sha256').update(manifest.join('\n')).digest('hex');
}

function hashConfigFingerprint(config: NormalizedPlaceFilesConfig): string {
  // Fingerprint the normalized settings, not the raw YAML bytes, and express
  // baseDir relative to the config file so the hash stays stable when the repo
  // moves between machines or checkouts.
  const fingerprint = {
    baseDir: relative(dirname(config.configPath), config.baseDir).split(sep).join('/'),
    versionFile: config.versionFile,
    appliedVersionFile: config.appliedVersionFile,
    entries: config.entries,
    backup: config.backup,
    behavior: config.behavior,
  };
  return createHash('sha256').update(JSON.stringify(sortKeysDeep(fingerprint))).digest('hex');
}

function sortKeysDeep(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(sortKeysDeep);
  }
  if (value !== null && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value)
        .sort(([left], [right]) => (left < right ? -1 : left > right ? 1 : 0))
        .map(([key, item]) => [key, sortKeysDeep(item)]),
    );
  }
  return value;
}

function readVersion(filePath: string): string | null {
  try {
    return readFileSync(filePath, 'utf8').trim();
  } catch {
    return null;
  }
}

function handleMissingSource(message: string, config: NormalizedPlaceFilesConfig): void {
  if (config.behavior.failOnMissingSource) {
    throw new Error(message);
  }
  log(`  [skip] ${message}`);
}

function log(message: string): void {
  console.log(message);
}
