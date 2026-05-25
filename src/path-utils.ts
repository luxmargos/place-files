import { isAbsolute, resolve } from 'node:path';

export function resolveFromBase(baseDir: string, value: string): string {
  return isAbsolute(value) ? value : resolve(baseDir, value);
}

export function isGlobPattern(value: string): boolean {
  return /[*?[{]/.test(value);
}
