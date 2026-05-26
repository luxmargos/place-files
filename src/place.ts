import { copyFileSync, cpSync, existsSync, globSync, mkdirSync, readFileSync, renameSync, statSync, writeFileSync } from 'node:fs';
import { basename, dirname, extname, isAbsolute, relative, resolve, sep } from 'node:path';
import { loadConfig } from './config.js';
import { isGlobPattern, resolveFromBase } from './path-utils.js';
import type { NormalizedPlaceFilesConfig, PlaceFilesOptions, PlaceFilesResult } from './types.js';

export function placeFiles(options: PlaceFilesOptions): PlaceFilesResult {
  const config = loadConfig(options.configPath);
  const logger = createLogger(options.verbose ?? false);

  const sourceVersion = readVersion(resolveFromBase(config.baseDir, config.versionFile));
  const appliedVersion = readVersion(resolveFromBase(config.baseDir, config.appliedVersionFile));
  const allDestinationsExist = checkAllDestinationsExist(config, logger);
  const versionChanged = sourceVersion === null
    ? config.behavior.placeWhenVersionMissing
    : appliedVersion === null || appliedVersion !== sourceVersion;

  if (!options.force && allDestinationsExist && !versionChanged) {
    logger.verbose('[place-files] no changes detected; exiting.');
    return { changed: false, copied: 0, backedUp: 0, skipped: 0 };
  }

  log(`[place-files] starting (version: ${sourceVersion ?? 'none'})`);

  let copied = 0;
  let backedUp = 0;
  let skipped = 0;

  for (const entry of config.entries) {
    if (isGlobPattern(entry.src)) {
      const matched = matchGlob(entry.src, config.baseDir);
      if (matched.length === 0) {
        handleMissingSource(`no matches: ${entry.src}`, config);
        skipped += 1;
        continue;
      }

      const dstDir = resolveFromBase(config.baseDir, entry.dst);
      for (const rel of matched) {
        const srcPath = resolve(config.baseDir, rel);
        const dstPath = resolve(dstDir, basename(rel));
        const result = copyOne(config, srcPath, dstPath, rel, relative(config.baseDir, dstPath), appliedVersion, options.dryRun ?? false);
        copied += result.copied;
        backedUp += result.backedUp;
      }
      continue;
    }

    const srcPath = resolveFromBase(config.baseDir, entry.src);
    const dstPath = resolveFromBase(config.baseDir, entry.dst);

    if (!existsSync(srcPath)) {
      handleMissingSource(`source not found: ${entry.src}`, config);
      skipped += 1;
      continue;
    }

    const result = copyOne(config, srcPath, dstPath, entry.src, entry.dst, appliedVersion, options.dryRun ?? false);
    copied += result.copied;
    backedUp += result.backedUp;
  }

  if (sourceVersion !== null && !options.dryRun) {
    const appliedVersionPath = resolveFromBase(config.baseDir, config.appliedVersionFile);
    mkdirSync(dirname(appliedVersionPath), { recursive: true });
    writeFileSync(appliedVersionPath, sourceVersion, 'utf8');
  }

  log(options.dryRun ? '[place-files] dry-run complete' : '[place-files] complete');
  return { changed: copied > 0 || backedUp > 0, copied, backedUp, skipped };
}

function checkAllDestinationsExist(config: NormalizedPlaceFilesConfig, logger: ReturnType<typeof createLogger>): boolean {
  return config.entries.every(({ src, dst }) => {
    if (isGlobPattern(src)) {
      const matched = matchGlob(src, config.baseDir);
      logger.verbose(`[place-files] glob ${src}: ${matched.length} match(es)`);
      return matched.length > 0 && matched.every((entry) => existsSync(resolve(resolveFromBase(config.baseDir, dst), basename(entry))));
    }
    return existsSync(resolveFromBase(config.baseDir, dst));
  });
}

function copyOne(
  config: NormalizedPlaceFilesConfig,
  srcPath: string,
  dstPath: string,
  srcLabel: string,
  dstLabel: string,
  appliedVersion: string | null,
  dryRun: boolean,
): { copied: number; backedUp: number } {
  let backedUp = 0;

  if (existsSync(dstPath) && config.backup.enabled) {
    const backupPath = makeBackupPath(config, dstPath, appliedVersion);
    if (!dryRun) {
      mkdirSync(dirname(backupPath), { recursive: true });
      renameSync(dstPath, backupPath);
    }
    log(`  [backup] ${basename(dstPath)} → ${relative(config.baseDir, backupPath)}`);
    backedUp += 1;
  }

  if (!dryRun) {
    copyEntry(srcPath, dstPath);
  }
  log(`  [copy] ${srcLabel} → ${dstLabel}`);
  return { copied: 1, backedUp };
}

function copyEntry(srcPath: string, dstPath: string): void {
  mkdirSync(dirname(dstPath), { recursive: true });
  if (statSync(srcPath).isDirectory()) {
    cpSync(srcPath, dstPath, { recursive: true });
    return;
  }
  copyFileSync(srcPath, dstPath);
}

function makeBackupPath(config: NormalizedPlaceFilesConfig, targetPath: string, previousVersion: string | null): string {
  const targetBasename = basename(targetPath);
  const targetExt = extname(targetBasename);
  const targetName = targetExt ? targetBasename.slice(0, -targetExt.length) : targetBasename;
  const targetRelativePath = relative(config.baseDir, targetPath);
  const targetRelativeDir = dirname(targetRelativePath);
  const datetime = new Date().toISOString().slice(0, 19).replace(/[-:]/g, '').replace('T', '_');
  const randomId = Math.random().toString(36).slice(2, 8);
  const previousVersionSuffix = config.backup.includePreviousVersion && previousVersion ? `_version-${previousVersion}` : '';
  const backupFormat = renderBackupFormat(config.backup.format, {
    basename: targetBasename,
    datetime,
    ext: targetExt,
    name: targetName,
    previous_version: previousVersion ?? '',
    previous_version_suffix: previousVersionSuffix,
    random: randomId,
    target_dir: targetRelativeDir === '.' ? '' : targetRelativeDir,
    target_path: targetRelativePath,
    version: previousVersion ?? '',
    version_suffix: previousVersionSuffix,
  });
  const backupRoot = config.backup.directory
    ? resolveFromBase(config.baseDir, config.backup.directory)
    : dirname(targetPath);

  return resolveBackupPath(backupRoot, backupFormat);
}

function renderBackupFormat(format: string, values: Record<string, string>): string {
  return format.replace(/\{([a-zA-Z0-9_]+)\}/g, (placeholder, name: string) => {
    const value = values[name];
    if (value === undefined) {
      throw new Error(`Unknown backup.format placeholder: ${placeholder}`);
    }
    return value;
  });
}

function resolveBackupPath(root: string, pathFormat: string): string {
  if (!pathFormat) {
    throw new Error('backup.format must not be empty.');
  }
  if (isAbsolute(pathFormat)) {
    throw new Error('backup.format must be a relative path format.');
  }

  const backupPath = resolve(root, pathFormat);
  const relativeBackupPath = relative(root, backupPath);
  if (relativeBackupPath === '' || relativeBackupPath === '..' || relativeBackupPath.startsWith(`..${sep}`) || isAbsolute(relativeBackupPath)) {
    throw new Error('backup.format must resolve inside the backup directory.');
  }

  return backupPath;
}

function matchGlob(pattern: string, cwd: string): string[] {
  return globSync(pattern, { cwd });
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

function createLogger(verbose: boolean): { verbose: (message: string) => void } {
  return {
    verbose(message: string): void {
      if (verbose) {
        log(message);
      }
    },
  };
}

function log(message: string): void {
  console.log(message);
}
