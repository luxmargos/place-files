# place-files

## Description

### For users

`place-files` puts files, directories, and glob matches into the paths you choose. It is useful for placing a prepared set of project files into the right locations, with backups and version checks built in.

### For developers

`place-files` is a TypeScript-based npm CLI package and library for config-driven file placement. It provides config discovery, YAML config normalization, version-based apply checks, backup handling, and dry-run support.

## Goals

- Place files from a simple YAML config
- Support files, directories, and glob patterns
- Run only when changes are detected based on a version file
- Back up existing target files before overwriting them
- Customize user-specific target paths and backup policies

## Usage example

```bash
npm install
npm run build
node dist/cli.js --config examples/basic/place-files.yml --dry-run
```

After installing the package, run it like this:

```bash
place-files --config ./place-files.yml
```

## Config files

Default config file candidates are searched in this order:

- `place-files.yml`
- `place-files.yaml`

Example configs, sample payloads, and a resettable testbed are collected in [[examples/README.md]].
Start with [[examples/simplest/place-files.yml]] or [[examples/basic/place-files.yml]], then use [[examples/testbed/README.md]] for a realistic backup/version test.

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
```

The example above does three things:

- Places one file at an exact target path.
- Places all matched JSON files into a target directory.
- Places a whole directory tree into a target directory.

## Key options

- `base_dir`
    - The base path for all relative paths.
    - If omitted, the directory containing the config file is used.
- `version_file`
    - A file that represents the version of the source file bundle.
    - Any value can be used, such as a version ID, date, or release string.
- `applied_version_file`
    - A local file that records the last placed version.
- `entries`
    - A list of files, directories, or glob patterns to place from `src` to `dst`.
    - If `src` is a glob pattern, `dst` is treated as a directory.
- `backup.enabled`
    - Whether to create a backup when the target already exists.
- `backup.directory`
    - Used to collect backup files in a separate directory.
- `backup.include_previous_version`
    - Determines whether to include the previously applied version in backup file names.
- `behavior.place_when_version_missing`
    - Determines whether to place files even when `version_file` is missing.
- `behavior.fail_on_missing_source`
    - Determines whether missing sources should be treated as failures.

## CLI options

```bash
place-files [options]
```

- `-c, --config <path>`: specify the config YAML path
- `--cwd <path>`: specify the base directory used when searching for default configs
- `--dry-run`: print the actions without changing files
- `--force`: run even when the version is unchanged
- `-v, --verbose`: print verbose logs
- `-h, --help`: print help
- `--version`: print the version

## Realistic testbed

Use the testbed to exercise real copy, backup, no-op, version-up, and force-run behavior:

```bash
npm run testbed:reset
npm run build
npm run testbed:dry-run
npm run testbed:run
npm run testbed:run
npm run testbed:force
```

To run the automated version-up regression check:

```bash
npm run test:version-up
```

The generated target directory is `examples/testbed/workdir/` and is ignored by Git.

## Library API

```ts
import { placeFiles } from 'place-files';

placeFiles({
  configPath: './place-files.yml',
  dryRun: true,
});
```

## Project structure

```text
place-files/
    src/
        cli.ts
        config.ts
        index.ts
        path-utils.ts
        place.ts
        types.ts
    examples/
        README.md
        simplest/
            place-files.yml
            place-files.version
            hello.txt
        basic/
            place-files.yml
            place-files.version
            payload/
                files/project-notes.md
                config/app.json
                config/logging.json
                assets/banner.txt
                assets/help.txt
        testbed/
            README.md
            place-files.yml
            source/
            workdir/    # generated and ignored
    package.json
    tsconfig.json
```
