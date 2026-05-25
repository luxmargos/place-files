#!/usr/bin/env node
import { rmSync, mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const workdir = resolve(root, 'examples/testbed/workdir');

function write(relativePath, content) {
  const filePath = resolve(workdir, relativePath);
  mkdirSync(dirname(filePath), { recursive: true });
  writeFileSync(filePath, content, 'utf8');
}

rmSync(workdir, { recursive: true, force: true });

write('.place-files.applied.version', 'testbed-old\n');
write('docs/project-notes.md', `# Local project notes

This stale local file should be backed up before the source bundle is placed.
`);
write('config/app.json', `{
  "appName": "old-local-demo",
  "theme": "light",
  "features": {
    "welcomeBanner": false
  }
}
`);
write('config/local-only.json', `{
  "note": "This file is not managed by place-files and should remain untouched."
}
`);
write('assets/banner.txt', `Old local banner. This directory should be backed up before replacement.
`);
write('assets/stale-only.txt', `This file exists only in the stale local assets directory.
`);

console.log(`Reset testbed workdir: ${workdir}`);
console.log('Next: npm run build && npm run testbed:dry-run');
