export interface FileEntry {
  src: string;
  dst: string;
}

export interface BackupConfig {
  enabled?: boolean;
  directory?: string;
  includePreviousVersion?: boolean;
  include_previous_version?: boolean;
}

export interface BehaviorConfig {
  placeWhenVersionMissing?: boolean;
  place_when_version_missing?: boolean;
  failOnMissingSource?: boolean;
  fail_on_missing_source?: boolean;
}

export interface PlaceFilesConfigFile {
  baseDir?: string;
  base_dir?: string;
  versionFile?: string;
  version_file?: string;
  appliedVersionFile?: string;
  applied_version_file?: string;
  entries?: FileEntry[];
  backup?: BackupConfig;
  behavior?: BehaviorConfig;
}

export interface NormalizedBackupConfig {
  enabled: boolean;
  directory?: string;
  includePreviousVersion: boolean;
}

export interface NormalizedBehaviorConfig {
  placeWhenVersionMissing: boolean;
  failOnMissingSource: boolean;
}

export interface NormalizedPlaceFilesConfig {
  configPath: string;
  baseDir: string;
  versionFile: string;
  appliedVersionFile: string;
  entries: FileEntry[];
  backup: NormalizedBackupConfig;
  behavior: NormalizedBehaviorConfig;
}

export interface PlaceFilesOptions {
  configPath: string;
  dryRun?: boolean;
  force?: boolean;
  verbose?: boolean;
}

export interface PlaceFilesResult {
  changed: boolean;
  copied: number;
  backedUp: number;
  skipped: number;
}
