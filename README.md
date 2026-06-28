# place-files

`place-files` is an npm CLI and library for copying prepared files into configured target paths.
It is designed for projects that need to place files, directories, or glob matches from a YAML config while keeping local backups and applying changes only when a source version changes.

## Features

- Place files from a simple YAML config.
- Support individual files, directories, and glob patterns.
- Skip repeated runs when the configured version has already been applied.
- Back up existing target files before overwriting them.
- Customize target paths, backup behavior, and missing-file behavior.
- Use as either a CLI or a TypeScript/JavaScript library.

## Install

Install in your project:

```bash
npm install @luxmargos/place-files
```

Or install globally for direct CLI usage:

```bash
npm install -g @luxmargos/place-files
```

## Quick start

Create a starter config and payload:

```bash
npx place-files init
```

Apply files from the generated config:

```bash
npx place-files --config ./place-files.yml
```

If installed globally, you can run the binary directly:

```bash
place-files init
place-files --config ./place-files.yml
```

`place-files init` creates:

- `place-files.yml`
- `place-files.version`
- `place-files-payload/hello.txt`

Use `place-files init --force` to overwrite an existing generated preset.

## Config files

By default, `place-files` searches for a config file in this order:

- `place-files.yml`
- `place-files.yaml`

Example configs and sample payloads are available in [examples/README.md](examples/README.md).
Start with [examples/simple/place-files.yml](examples/simple/place-files.yml) or [examples/basic/place-files.yml](examples/basic/place-files.yml).

## Config example

```yaml
base_dir: .
version_file: place-files.version
applied_version_file: .place-files.applied.version

entries:
  - src: payload/files/project-notes.md
    dst: output/project-notes.md
  - src: payload/config/*.json
    dst: output/config
  - src: payload/assets
    dst: output/assets

behavior:
  preserve_glob_paths: true
```

This example:

- Places one file at an exact target path.
- Places all matched JSON files into a target directory while preserving their paths from `base_dir`.
- Places a whole directory tree into a target directory.

## Key config options

- `base_dir`
  - Base path for all relative paths.
  - If omitted, the directory containing the config file is used.
- `version_file`
  - File containing the source bundle version.
  - Any value can be used, such as a version ID, date, or release string.
- `applied_version_file`
  - Local file that records the last applied version.
- `entries`
  - List of files, directories, or glob patterns to place from `src` to `dst`.
  - If `src` is a glob pattern, `dst` is treated as a directory.
  - By default, glob matches preserve their paths relative to `base_dir`. For example, `payload/config/*.json` copied to `output/config` places `payload/config/app.json` at `output/config/payload/config/app.json`.
- `backup.enabled`
  - Whether to create a backup when the target already exists.
- `backup.directory`
  - Directory used to collect backup files.
- `backup.format`
  - Format for backup file or folder paths. Defaults to `{basename}.{datetime}_{random}{previous_version_suffix}.backup`.
  - Supports placeholders: `{basename}`, `{name}`, `{ext}`, `{datetime}`, `{random}`, `{previous_version}`, `{previous_version_suffix}`, `{version}`, `{version_suffix}`, `{target_dir}`, and `{target_path}`.
  - When `backup.directory` is set, the format is relative to that directory; otherwise, it is relative to the target file's directory.
- `backup.include_previous_version`
  - Whether to include the previously applied version in default backup file names and `{previous_version_suffix}` / `{version_suffix}`.
- `behavior.place_when_version_missing`
  - Whether to place files when `version_file` is missing.
- `behavior.fail_on_missing_source`
  - Whether missing sources should fail the run.
- `behavior.preserve_glob_paths`
  - Whether glob matches preserve their paths relative to `base_dir`. Defaults to `true`.
  - Set to `false` to flatten matched files into the destination directory.

## CLI

```bash
place-files [options]
place-files init [simple] [options]
```

Commands:

- `init`: generate a simple preset config and payload in the current directory.

Options:

- `-c, --config <path>`: specify the config YAML path.
- `--cwd <path>`: specify the base directory used when searching for default configs.
- `--dry-run`: print the planned actions without changing files.
- `--force`: run even when the version is unchanged; with `init`, overwrite preset files.
- `-v, --verbose`: print verbose logs.
- `-h, --help`: print help.
- `--version`: print the package version.

## Library API

```ts
import { placeFiles } from '@luxmargos/place-files';

await placeFiles({
  configPath: './place-files.yml',
  dryRun: true,
});
```

## Development

This section is for contributors working from the source repository.

Install dependencies and build:

```bash
npm install
npm run build
```

Run type checks and tests:

```bash
npm run typecheck
npm test
```

Run a local development example:

```bash
node dist/cli.js --config examples/basic/place-files.yml --dry-run
```

### Testbed

Use the testbed to exercise real copy, backup, no-op, version-up, and force-run behavior:

```bash
npm run testbed:reset
npm run build
npm run testbed:dry-run
npm run testbed:run
npm run testbed:run
npm run testbed:force
```

To run only the automated version-up regression check:

```bash
npm run test:version-up
```

The generated target directory is `examples/testbed/workdir/` and is ignored by Git.
