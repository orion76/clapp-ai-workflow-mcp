/**
 * Development check client for the `@clapp/ai-workflow-mcp` server.
 *
 * This script is a development tool of the repository, not a part of the published package:
 * `files`/`bin` of the package do not mention `scripts/`, and `tsconfig.build.json` compiles
 * `src` TypeScript sources only, so nothing of it reaches `dist`.
 *
 * The client starts the server itself — `StdioClientTransport` launches the local `tsx` binary
 * from `node_modules/.bin` with the repository `tsconfig.dev.json` and the bin of the package,
 * with the repository root as the working directory — and speaks the protocol over the stdio of
 * that child process. It then checks the three MCP surfaces, successful calls, schema validation,
 * request errors and the liveness of the connection after every failure; the checks are printed
 * as one JSON document on the stdout of the client.
 *
 * Exit code: `0` when every check passed, `1` when at least one check failed. A failed check is
 * listed in the report with its `name` and `detail`.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { Client } from '@modelcontextprotocol/client';
import { StdioClientTransport } from '@modelcontextprotocol/client/stdio';

const SCRIPTS_DIR = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(SCRIPTS_DIR, '..', '..', '..');
const PACKAGE_ROOT = path.join(REPO_ROOT, 'packages', 'ai-workflow-mcp');
const CONFIG_PATH = path.join(PACKAGE_ROOT, 'clapp.config.yml');
const TSX_BIN = path.join(REPO_ROOT, 'node_modules', '.bin', 'tsx');
const TS_CONFIG = 'tsconfig.dev.json';
const ENTRY = 'packages/ai-workflow-mcp/src/bin/clapp-ai-mcp.ts';
const TMP_DIR = path.join(REPO_ROOT, 'tmp', 'ai-workflow-mcp-check');
const SKILL_NAME = 'check-skill';
const SKILL_DESCRIPTION = 'Created by the check client';
const SKILL_PATH = path.join(TMP_DIR, '.opencode', 'skills', SKILL_NAME, 'SKILL.md');
const PROMPT_GOAL = 'Check the ai-workflow-mcp host';

const checks: Array<{ name: string; ok: boolean; detail: string }> = [];
const observedTexts: string[] = [];

/**
 * Narrows a value to a plain object.
 * @param value Value to inspect
 * @returns `true` when the value is a non-null object
 */
function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

/**
 * Reads a field of a value that may not be an object.
 * @param value Subject of the lookup
 * @param key Field name
 * @returns Field value, or `undefined` when the subject is not an object
 */
function fieldOf(value: unknown, key: string): unknown {
  return isRecord(value) ? value[key] : undefined;
}

/**
 * Reads an array field of a value that may not be an object.
 * @param value Subject of the lookup
 * @param key Field name
 * @returns Array value, or an empty array when the field is absent or not an array
 */
function arrayField(value: unknown, key: string): unknown[] {
  const field = fieldOf(value, key);

  return Array.isArray(field) ? field : [];
}

/**
 * Narrows a content block to a text block.
 * @param value Content block to inspect
 * @returns `true` when the block carries text
 */
function isTextBlock(value: unknown): value is { type: 'text'; text: string } {
  return isRecord(value) && value.type === 'text' && typeof value.text === 'string';
}

/**
 * Collects the text blocks of an MCP content array.
 * @param value Content array of a result
 * @returns Texts of the text blocks
 */
function textBlocks(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter(isTextBlock).map((block) => block.text);
}

/**
 * Reports whether an MCP tool result is flagged as an error.
 * @param value Result of a tool call
 * @returns `true` when the result carries `isError: true`
 */
function isErrorResult(value: unknown): boolean {
  return isRecord(value) && value.isError === true;
}

/**
 * Serializes a value for the `detail` field of a check.
 * @param value Value to describe
 * @returns Text or JSON of the value
 */
function summarize(value: unknown): string {
  if (typeof value === 'string') {
    return value;
  }

  try {
    const json = JSON.stringify(value);

    return json === undefined ? String(value) : json;
  } catch {
    return String(value);
  }
}

/**
 * Appends a check to the report.
 * @param name What the check verifies
 * @param ok Outcome of the check
 * @param detail Observed value or explanation
 */
function record(name: string, ok: boolean, detail: unknown): void {
  checks.push({ name, ok, detail: summarize(detail) });
}

/**
 * Runs an operation that is expected to fail and reports how it failed.
 * @param run Operation under test
 * @returns Whether it threw, the error message and the returned value when it did not throw
 */
async function expectFailure(run: () => Promise<unknown>): Promise<{ threw: boolean; message: string; result?: unknown }> {
  try {
    return { threw: false, message: '', result: await run() };
  } catch (error) {
    return { threw: true, message: error instanceof Error ? error.message : String(error) };
  }
}

/**
 * Matches the URI template of the `skill/list` resource.
 *
 * The template carries both query variables of the command, and the check accepts them in any
 * order — a template is a set of variables, not a sequence.
 * @param uriTemplate Template reported by `resources/templates/list`
 * @returns `true` when the template is `clapp://skill/list{?dir,scope}`
 */
function matchesSkillListTemplate(uriTemplate: unknown): boolean {
  if (typeof uriTemplate !== 'string') {
    return false;
  }

  const match = /^clapp:\/\/skill\/list\{\?([^}]+)\}$/.exec(uriTemplate);

  if (match === null) {
    return false;
  }

  const variables = match[1].split(',');

  return variables.length === 2 && variables.includes('dir') && variables.includes('scope');
}

/**
 * Reads the description of the application config without a YAML dependency.
 * @returns Description of `clapp.config.yml`, or `undefined` when the field is absent
 */
function readConfigDescription(): string | undefined {
  const configText = fs.readFileSync(CONFIG_PATH, 'utf8');
  const match = /^description:[ \t]*(.+)$/m.exec(configText);

  return match === null ? undefined : match[1].trim();
}

const env: Record<string, string> = {};

for (const [key, value] of Object.entries(process.env)) {
  if (value !== undefined) {
    env[key] = value;
  }
}

fs.rmSync(TMP_DIR, { recursive: true, force: true });
fs.mkdirSync(TMP_DIR, { recursive: true });

const transport = new StdioClientTransport({
  command: TSX_BIN,
  args: ['--tsconfig', TS_CONFIG, ENTRY],
  cwd: REPO_ROOT,
  env,
  stderr: 'pipe',
});

const stderrChunks: Buffer[] = [];
const stderrStream = transport.stderr;

if (stderrStream) {
  stderrStream.on('data', (chunk: Buffer) => stderrChunks.push(chunk));
}

const client = new Client({ name: 'ai-workflow-mcp-check', version: '0.0.0' }, { capabilities: {} });

try {
  await client.connect(transport);

  const serverVersion = client.getServerVersion();
  const expectedDescription = readConfigDescription();
  record(
    'initialize: serverInfo name, version and description from clapp.config.yml',
    serverVersion?.name === 'ai-workflow-mcp' &&
      serverVersion?.version === '0.0.1' &&
      expectedDescription !== undefined &&
      serverVersion?.description === expectedDescription,
    summarize({ serverVersion, expectedDescription }),
  );

  const tools = await client.listTools();
  const skillAddTool = tools.tools.find((tool) => tool.name === 'skill/add');
  record(
    'tools/list: skill/add is a tool with readOnlyHint false and the skill group is absent',
    skillAddTool !== undefined &&
      skillAddTool.annotations?.readOnlyHint === false &&
      !tools.tools.some((tool) => tool.name === 'skill'),
    summarize({ tools: tools.tools.map((tool) => tool.name), annotations: skillAddTool?.annotations }),
  );

  const resources = await client.listResources();
  const templates = await client.listResourceTemplates();
  const skillListTemplate = templates.resourceTemplates.find((template) => template.name === 'skill/list');
  const staticSkillList = resources.resources.some(
    (resource) => resource.name === 'skill/list' || resource.uri.startsWith('clapp://skill/list'),
  );
  record(
    'resources: skill/list is a dir/scope URI template and not a static resource',
    skillListTemplate !== undefined && matchesSkillListTemplate(skillListTemplate.uriTemplate) && !staticSkillList,
    summarize({ templates: templates.resourceTemplates, resources: resources.resources }),
  );

  const prompts = await client.listPrompts();
  const briefPrompt = prompts.prompts.find((prompt) => prompt.name === 'brief');
  const briefGoalArgument = (briefPrompt?.arguments ?? []).some((argument) => argument.name === 'goal');
  record(
    'prompts/list: brief declares the goal argument',
    briefPrompt !== undefined && briefGoalArgument,
    summarize(prompts.prompts),
  );

  const addResult = await client.callTool({
    name: 'skill/add',
    arguments: {
      name: SKILL_NAME,
      description: SKILL_DESCRIPTION,
      dir: TMP_DIR,
      scope: 'project',
      force: true,
    },
  });
  const addTexts = textBlocks(fieldOf(addResult, 'content'));
  const addText = addTexts.join('\n');
  observedTexts.push(...addTexts);
  record(
    'tools/call skill/add: success text carries name, scope and path; SKILL.md is written',
    !isErrorResult(addResult) &&
      addTexts.length > 0 &&
      /^name\s+check-skill$/m.test(addText) &&
      /^scope\s+project$/m.test(addText) &&
      addText.includes(SKILL_PATH) &&
      fs.existsSync(SKILL_PATH),
    summarize({ text: addText, path: SKILL_PATH }),
  );

  // The engine hands URI template variables to the command verbatim (the SDK matches the raw
  // URI), so the directory goes into the query as a plain path rather than a percent-encoded value.
  const skillListUri = `clapp://skill/list?dir=${TMP_DIR}&scope=project`;
  const listResult = await client.readResource({ uri: skillListUri });
  const listContents = arrayField(listResult, 'contents').filter(isRecord);
  const listContent = listContents[0];
  const listText = listContent !== undefined && typeof listContent.text === 'string' ? listContent.text : '';
  observedTexts.push(listText);
  record(
    'resources/read skill/list: text/plain content lists the created skill',
    listContent !== undefined && listContent.mimeType === 'text/plain' && listText.includes(SKILL_NAME),
    summarize({ uri: skillListUri, contents: listContents }),
  );

  const promptResult = await client.getPrompt({ name: 'brief', arguments: { goal: PROMPT_GOAL, depth: 'detailed' } });
  const promptMessages = arrayField(promptResult, 'messages');
  const promptMessage = isRecord(promptMessages[0]) ? promptMessages[0] : undefined;
  const promptContent = fieldOf(promptMessage, 'content');
  const promptTexts = textBlocks([promptContent]);
  observedTexts.push(...promptTexts);
  record(
    'prompts/get brief: exactly one user message with text containing the goal',
    promptMessages.length === 1 &&
      fieldOf(promptMessage, 'role') === 'user' &&
      fieldOf(promptContent, 'type') === 'text' &&
      promptTexts.length === 1 &&
      promptTexts[0].includes(PROMPT_GOAL),
    summarize(promptResult),
  );

  const unknownTool = await expectFailure(() => client.callTool({ name: 'skill/absent', arguments: {} }));
  const invalidAdd = await expectFailure(() => client.callTool({ name: 'skill/add', arguments: { dir: TMP_DIR } }));
  const missingVariable = await expectFailure(() => client.readResource({ uri: `clapp://skill/list?dir=${TMP_DIR}` }));
  const unknownPrompt = await expectFailure(() => client.getPrompt({ name: 'absent', arguments: {} }));

  const invalidAddTexts = textBlocks(fieldOf(invalidAdd.result, 'content'));
  observedTexts.push(...invalidAddTexts);

  for (const message of [unknownTool.message, invalidAdd.message, missingVariable.message, unknownPrompt.message]) {
    if (message.length > 0) {
      observedTexts.push(message);
    }
  }

  record(
    'negative: unknown tool/prompt and an incomplete URI are request errors; skill/add without name is an isError result',
    unknownTool.threw &&
      missingVariable.threw &&
      unknownPrompt.threw &&
      !invalidAdd.threw &&
      isErrorResult(invalidAdd.result),
    summarize({
      unknownTool: { threw: unknownTool.threw, message: unknownTool.message },
      invalidAdd: { threw: invalidAdd.threw, isError: isErrorResult(invalidAdd.result), text: invalidAddTexts },
      missingVariable: { threw: missingVariable.threw, message: missingVariable.message },
      unknownPrompt: { threw: unknownPrompt.threw, message: unknownPrompt.message },
    }),
  );

  const toolsAfterErrors = await client.listTools();
  const briefAfterErrors = await client.getPrompt({ name: 'brief', arguments: { goal: PROMPT_GOAL } });
  const briefAfterMessages = arrayField(briefAfterErrors, 'messages');
  record(
    'liveness: tools/list and prompts/get answer after every failure',
    toolsAfterErrors.tools.some((tool) => tool.name === 'skill/add') && briefAfterMessages.length === 1,
    summarize({ tools: toolsAfterErrors.tools.map((tool) => tool.name), messages: briefAfterMessages.length }),
  );

  record(
    'rendering: no ANSI escape sequence in any received text',
    observedTexts.length > 0 && observedTexts.every((text) => !text.includes('\u001b[')),
    `${observedTexts.length} texts checked`,
  );
} catch (error) {
  record('client session', false, error instanceof Error ? `${error.message}\n${error.stack ?? ''}` : String(error));
} finally {
  await client.close();
  fs.rmSync(TMP_DIR, { recursive: true, force: true });
}

const failed = checks.filter((check) => !check.ok);
const report = {
  checks,
  summary: { total: checks.length, failed: failed.length },
  serverStderr: Buffer.concat(stderrChunks).toString('utf8').trim(),
};

process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);

process.exitCode = failed.length === 0 ? 0 : 1;
