#!/usr/bin/env node
import 'reflect-metadata';

import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { MCPEngine, run } from '@clapp/core';
import { Container } from 'inversify';

const here = path.dirname(fileURLToPath(import.meta.url));
const packageRoot = path.resolve(here, '..', '..');
/**
 * Application root — the package directory that holds `clapp.config.yml`.
 *
 * Sources of type `appRoot` and the library lookup of the config are resolved against this
 * root, so it is never `process.cwd()`: the server exposes its own set of commands no matter
 * which directory the client starts it from. The commands are not carried by this host
 * package: they are plugins of the libraries named by `clapp.config.yml`
 * (`@clapp/ai-workflow-plugins`, `@clapp/core`). `dist` is not an application root — it only
 * mirrors `src` and does not hold the config.
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
 * `process.cwd()`, because the config and its source roots are resolved against it, so the
 * server exposes its own set no matter which directory the client starts the process from.
 *
 * Nothing is printed here either: under the stdio transport stdout carries the protocol
 * stream, so the engine is the only writer, and only to stderr.
 */
await run(MCPEngine, container, { appRoot, configPath });
