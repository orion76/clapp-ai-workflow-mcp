#!/usr/bin/env node
import 'reflect-metadata';

import { getAppMeta, initAppMeta } from '@clapp/common';
import { MCPEngine, resolveConfigPath, run } from '@clapp/core';
import { Container } from 'inversify';

initAppMeta()
const { appRoot } = getAppMeta();
const configPath = resolveConfigPath(appRoot);

const container = new Container();

await run(MCPEngine, container, { configPath });
