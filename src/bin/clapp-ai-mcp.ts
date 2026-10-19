#!/usr/bin/env node
import 'reflect-metadata';

import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { MCPEngine, run } from '@clapp/core';
import { Container } from 'inversify';

const here = path.dirname(fileURLToPath(import.meta.url));
const packageRoot = path.resolve(here, '..', '..');
/**
 * `true` when the entry point runs from the built package (`dist/bin`), `false` in
 * development (`src/bin`). The built layout does not ship `plugins/**` yet, so both modes use
 * the package root as the application root; the flag is kept explicit for that future layout.
 */
const isDist = here.split(path.sep).includes('dist');
/**
 * Application root — the package directory that holds `plugins/` and `clapp.config.yml`.
 *
 * Commands of this host live in `plugins/**` outside `src`, and `run` resolves relative
 * discovery patterns against this root, so it is never `process.cwd()`: the server exposes
 * its own set of commands no matter which directory the client starts it from. `dist` is not
 * an application root for the same reason — it only mirrors `src` and does not carry the
 * plugins, so the built package would discover nothing there.
 */
const appRoot = packageRoot;
const configPath = path.join(packageRoot, 'clapp.config.yml');

const container = new Container();

/**
 * Starts the workflow server as an MCP server over the stdio transport.
 *
 * The mode is a separate executable rather than a subcommand of a CLI: this package is an
 * MCP host, so the engine is chosen here, at the entry point, and handed to `run` — exactly
 * as a CLI entry point chooses `CliEngine`. The application root is the package itself, never
 * `process.cwd()`: the commands of the package live in `plugins/**` next to this file, and
 * discovery patterns are resolved against that root, so the server exposes its own set no
 * matter which directory the client starts the process from.
 *
 * Nothing is printed here either: under the stdio transport stdout carries the protocol
 * stream, so the engine is the only writer, and only to stderr.
 */
await run(MCPEngine, container, { appRoot, configPath });
