# Testbed

This is a realistic, resettable playground for `place-files`.

It uses tracked source files in `source/` and writes into generated local state in `workdir/`.
The `workdir/` directory is ignored by Git so you can freely run destructive copy and backup tests.

## What it tests

- Existing target files are backed up before replacement.
- Glob matches place multiple files into a target directory.
- A whole directory is backed up and replaced.
- Unmanaged files outside the selected targets remain untouched.
- The applied version file makes the second run a no-op.
- Bumping the source version runs again without `--force`.
- `--force` runs again even when the version has not changed.

## Run it

From the repository root:

```bash
npm run testbed:reset
npm run build
npm run testbed:dry-run
npm run testbed:run
npm run testbed:run
npm run testbed:force
```

Run the automated version-up regression check with:

```bash
npm run test:version-up
```

Expected behavior:

1. `testbed:reset` recreates `workdir/` with stale local files.
2. `testbed:dry-run` prints planned copies/backups without changing files.
3. The first `testbed:run` backs up stale files and places source files.
4. The second `testbed:run` exits without changes because the version is already applied.
5. `testbed:force` backs up the current placed files and places them again.
6. `test:version-up` verifies that changing `source/place-files.version` causes another non-force apply, updates the applied version, and creates backups tagged with the previous version.

## Useful paths

- Config: `examples/testbed/place-files.yml`
- Source bundle: `examples/testbed/source/`
- Generated target directory: `examples/testbed/workdir/`
- Preserved glob output: `examples/testbed/workdir/config/source/config/`
- Backup directory: `examples/testbed/workdir/.place-files-backups/`
