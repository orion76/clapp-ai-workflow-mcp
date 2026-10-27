#!/usr/bin/env node
import 'reflect-metadata';

import path from 'node:path';

import { getAppMeta, initAppMeta } from '@clapp/common';
import { MCPEngine, run } from '@clapp/core';
import { Container } from 'inversify';

initAppMeta()
const { appRoot } = getAppMeta();
const configPath = path.join(appRoot, 'clapp.config.yml');

const container = new Container();

await run(MCPEngine, container, { configPath });
