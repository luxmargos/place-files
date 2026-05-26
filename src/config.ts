import { existsSync, readFileSync } from 'node:fs';
import { dirname, isAbsolute, resolve } from 'node:path';
import { parse } from 'yaml';
import type { NormalizedPlaceFilesConfig, PlaceFilesConfigFile } from './types.js';

export const DEFAULT_CONFIG_NAMES = [
  'place-files.yml',
  'place-files.yaml',
] as const;

export const DEFAULT_BACKUP_FORMAT = '{basename}.{datetime}_{random}{previous_version_suffix}.backup';

export function findConfigPath(cwd: string, explicitPath?: string): string {
  if (explicitPath) {
    const configPath = resolve(cwd, explicitPath);
    if (!existsSync(configPath)) {
      throw new Error(`Cannot find config file: ${configPath}`);
    }
    return configPath;
  }

  for (const name of DEFAULT_CONFIG_NAMES) {
    const configPath = resolve(cwd, name);
    if (existsSync(configPath)) {
      return configPath;
    }
  }

  throw new Error(`Cannot find a config file. Default candidates: ${DEFAULT_CONFIG_NAMES.join(', ')}`);
}

export function loadConfig(configPath: string): NormalizedPlaceFilesConfig {
  const raw = parse(readFileSync(configPath, 'utf8')) as PlaceFilesConfigFile | null;
  if (!raw || typeof raw !== 'object') {
    throw new Error(`Config file is empty or is not a valid YAML object: ${configPath}`);
  }

  const configDir = dirname(configPath);
  const baseDirValue = raw.baseDir ?? raw.base_dir ?? '.';
  const baseDir = resolvePath(configDir, baseDirValue);
  const versionFile = raw.versionFile ?? raw.version_file;
  const appliedVersionFile = raw.appliedVersionFile ?? raw.applied_version_file;
  const entries = raw.entries;

  if (!versionFile) {
    throw new Error('versionFile or version_file is required in the config file.');
  }
  if (!appliedVersionFile) {
    throw new Error('appliedVersionFile or applied_version_file is required in the config file.');
  }
  if (!Array.isArray(entries)) {
    throw new Error('The config file requires an entries array.');
  }

  for (const [index, entry] of entries.entries()) {
    if (!entry?.src || !entry?.dst) {
      throw new Error(`entries[${index}] requires src and dst.`);
    }
  }

  return {
    configPath,
    baseDir,
    versionFile,
    appliedVersionFile,
    entries,
    backup: {
      enabled: raw.backup?.enabled ?? true,
      directory: raw.backup?.directory,
      format: raw.backup?.format ?? raw.backup?.nameFormat ?? raw.backup?.name_format ?? DEFAULT_BACKUP_FORMAT,
      includePreviousVersion: raw.backup?.includePreviousVersion
        ?? raw.backup?.include_previous_version
        ?? true,
    },
    behavior: {
      placeWhenVersionMissing: raw.behavior?.placeWhenVersionMissing
        ?? raw.behavior?.place_when_version_missing
        ?? true,
      failOnMissingSource: raw.behavior?.failOnMissingSource ?? raw.behavior?.fail_on_missing_source ?? false,
    },
  };
}

function resolvePath(baseDir: string, value: string): string {
  return isAbsolute(value) ? value : resolve(baseDir, value);
}
