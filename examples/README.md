# Examples

This directory contains ready-to-copy `place-files` config examples, sample payloads, and a resettable testbed.

## Generate a simple preset

Use the CLI to create a ready-to-edit starter config in your project:

```bash
place-files init
```

This writes `place-files.yml`, `place-files.version`, and `place-files-payload/hello.txt`.

## Simple example

`simple/place-files.yml` shows the same one-file idea as a tracked example.

```text
examples/simple/
    place-files.yml
    place-files.version
    hello.txt
```

Try it after building:

```bash
node dist/cli.js --config examples/simple/place-files.yml --dry-run
```

Remove `--dry-run` to create `examples/simple/output/hello.txt`.

## Basic example

`basic/place-files.yml` is intentionally generic. It demonstrates the three core actions:

1. Place a single file.
2. Place files matched by a glob into a directory.
3. Place a whole directory tree.

```text
examples/basic/
    place-files.yml
    place-files.version
    payload/
        files/project-notes.md
        config/app.json
        config/logging.json
        assets/banner.txt
        assets/help.txt
```

## What the basic example would do

With `base_dir: .` inside `examples/basic/place-files.yml`:

- `payload/files/project-notes.md` is placed at `output/project-notes.md`.
- `payload/config/*.json` is placed into `output/config/payload/config/` because this example sets `behavior.preserve_glob_paths: true`.
- `payload/assets` is placed at `output/assets` as a directory tree.

Glob matches preserve their paths relative to `base_dir` by default. For example, `payload/assets/**` copied to `output` places `payload/assets/banner.txt` at `output/payload/assets/banner.txt`.

## Try the basic example

```bash
node dist/cli.js --config examples/basic/place-files.yml --dry-run
```

Remove `--dry-run` to create the `examples/basic/output/` directory.

## Realistic testbed

`testbed/` is a resettable playground with stale target files, local-only files, a source bundle, backups, and applied-version state.

```bash
npm run testbed:reset
npm run build
npm run testbed:dry-run
npm run testbed:run
npm run testbed:run
npm run testbed:force
npm run test:version-up
```

See [[testbed/README.md]] for the expected behavior.

Copy `examples/basic/place-files.yml` to `place-files.yml` and adjust the paths for your project.
