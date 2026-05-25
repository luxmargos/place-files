import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

export interface WriteSimplePresetOptions {
  cwd: string;
  force?: boolean;
  dryRun?: boolean;
}

export interface PresetFileResult {
  relativePath: string;
  path: string;
  action: 'create' | 'overwrite';
}

export interface WriteSimplePresetResult {
  dryRun: boolean;
  files: PresetFileResult[];
}

const SIMPLE_PRESET_FILES: Array<{ relativePath: string; content: string }> = [
  {
    relativePath: 'place-files.yml',
    content: `base_dir: .
version_file: place-files.version
applied_version_file: .place-files.applied.version

entries:
  - src: place-files-payload/hello.txt
    dst: output/hello.txt
`,
  },
  {
    relativePath: 'place-files.version',
    content: 'simple-v1\n',
  },
  {
    relativePath: 'place-files-payload/hello.txt',
    content: 'Hello from place-files.\n',
  },
];

export function writeSimplePreset(options: WriteSimplePresetOptions): WriteSimplePresetResult {
  const force = options.force ?? false;
  const dryRun = options.dryRun ?? false;
  const files = SIMPLE_PRESET_FILES.map(({ relativePath }) => {
    const path = resolve(options.cwd, relativePath);
    return {
      relativePath,
      path,
      action: existsSync(path) ? 'overwrite' as const : 'create' as const,
    };
  });

  const existingFiles = files.filter((file) => file.action === 'overwrite');
  if (existingFiles.length > 0 && !force && !dryRun) {
    throw new Error(
      `Refusing to overwrite existing preset file(s): ${existingFiles.map((file) => file.relativePath).join(', ')}. Use --force to overwrite.`,
    );
  }

  if (!dryRun) {
    for (const file of SIMPLE_PRESET_FILES) {
      const filePath = resolve(options.cwd, file.relativePath);
      mkdirSync(dirname(filePath), { recursive: true });
      writeFileSync(filePath, file.content, 'utf8');
    }
  }

  return { dryRun, files };
}
