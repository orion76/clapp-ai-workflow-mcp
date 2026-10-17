#!/usr/bin/env node
import 'reflect-metadata';

import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { MCPEngine, run } from '@clapp/core';
import { Container } from 'inversify';

const here = path.dirname(fileURLToPath(import.meta.url));
const packageRoot = path.resolve(here, '..', '..');
const isDist = here.split(path.sep).includes('dist');
const appRoot = path.join(packageRoot, isDist ? 'dist' : 'src');
const configPath = path.join(packageRoot, 'clapp.config.yml');

const container = new Container();

/**
 * Starts the workflow server as an MCP server over the stdio transport.
 *
 * The mode is a separate executable rather than a subcommand of a CLI: this package is an
 * MCP host, so the engine is chosen here, at the entry point, and handed to `run` — exactly
 * as a CLI entry point chooses `CliEngine`. The application root is the package itself
 * (`src` in development, `dist` in the built package), never `process.cwd()`: the commands
 * and formatters of the package live next to this file, and discovery patterns are resolved
 * against that root, so the server exposes its own set no matter which directory the client
 * starts the process from.
 *
 * Nothing is printed here either: under the stdio transport stdout carries the protocol
 * stream, so the engine is the only writer, and only to stderr.
 */
await run(MCPEngine, container, { appRoot, configPath });
