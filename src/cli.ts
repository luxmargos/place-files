#!/usr/bin/env node
import { resolve } from 'node:path';
import { findConfigPath } from './config.js';
import { placeFiles } from './place.js';

const VERSION = '0.1.0';

interface CliArgs {
  config?: string;
  cwd: string;
  dryRun: boolean;
  force: boolean;
  verbose: boolean;
  help: boolean;
  version: boolean;
}

async function main(argv: string[]): Promise<void> {
  const args = parseArgs(argv.slice(2));

  if (args.help) {
    printHelp();
    return;
  }

  if (args.version) {
    console.log(VERSION);
    return;
  }

  const configPath = findConfigPath(args.cwd, args.config);
  placeFiles({
    configPath,
    dryRun: args.dryRun,
    force: args.force,
    verbose: args.verbose,
  });
}

function parseArgs(args: string[]): CliArgs {
  const parsed: CliArgs = {
    cwd: process.cwd(),
    dryRun: false,
    force: false,
    verbose: false,
    help: false,
    version: false,
  };

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];

    switch (arg) {
      case '-c':
      case '--config':
        parsed.config = readValue(args, ++index, arg);
        break;
      case '--cwd':
        parsed.cwd = resolve(readValue(args, ++index, arg));
        break;
      case '--dry-run':
        parsed.dryRun = true;
        break;
      case '--force':
        parsed.force = true;
        break;
      case '-v':
      case '--verbose':
        parsed.verbose = true;
        break;
      case '-h':
      case '--help':
        parsed.help = true;
        break;
      case '--version':
        parsed.version = true;
        break;
      default:
        if (arg.startsWith('--config=')) {
          parsed.config = arg.slice('--config='.length);
          break;
        }
        if (arg.startsWith('--cwd=')) {
          parsed.cwd = resolve(arg.slice('--cwd='.length));
          break;
        }
        throw new Error(`Unknown option: ${arg}`);
    }
  }

  return parsed;
}

function readValue(args: string[], index: number, optionName: string): string {
  const value = args[index];
  if (!value) {
    throw new Error(`${optionName} requires a value.`);
  }
  return value;
}

function printHelp(): void {
  console.log(`place-files ${VERSION}

Places files, directories, and glob matches from a config file into target paths.

Usage:
  place-files [options]

Options:
  -c, --config <path>  Specify the config YAML path.
      --cwd <path>     Base directory used when searching for a default config. Default: current directory
      --dry-run        Print the actions without changing files.
      --force          Run even when the version is unchanged.
  -v, --verbose        Print verbose logs.
  -h, --help           Print help.
      --version        Print the version.

Default config file candidates:
  place-files.yml, place-files.yaml
`);
}

main(process.argv).catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`[place-files] failed: ${message}`);
  process.exitCode = 1;
});
