> ⚠️ **Work in progress.** This package is under active development. A release is expected soon, but it is **not production-ready** yet: the API may change without notice. Do not use it in production.

> ⚠️ **В разработке.** Пакет ещё не готов к релизу: релиз ожидается в ближайшее время, API может меняться. Использовать в продакшне пока нельзя.

**English** | [Русский](./docs/ru/README.md)

# @clapp/ai-workflow-mcp

The `clapp-ai-mcp` MCP server of the AI-assisted development workflow: the same command plugins as the `clapp-ai` CLI, exposed over the Model Context Protocol through the `MCPEngine` of `@clapp/core`. The package is a thin host of the [`orion76/clapp`](https://github.com/orion76/clapp) monorepo — it carries no command of its own, only the `bin`, its `clapp.config.yml` and the plugin sources that config declares.

## Features

- **`clapp-ai-mcp` bin** — a server that initialises the application, loads its own `clapp.config.yml` and serves the commands over the stdio transport.
- **The plugin set of the workflow** — `init`, `skill add`, `skill list`, `task add`, `task list`, `task todo`, `board list`, `board next`, `npm-info` and the `brief` prompt come from `@clapp/ai-workflow-plugins`.
- **A surface per command kind** — `kind: tool` becomes an MCP Tool, `kind: resource` an MCP Resource and `kind: prompt` an MCP Prompt; a group node only prefixes the path of its subcommands.
- **Stable entity names** — an entity is addressed by the command path in the hierarchy (`task/list`, `board/next`), and its arguments and options are described by a schema generated from the command definition.
- **The same rendered text as the CLI** — a result is passed through the formatter the command declares, so a client receives the text the CLI would print.
- **Explicit reporting of what is not exposed** — a command that declares no formatter is left out of the registry and reported to stderr instead of disappearing silently.
- **Per-connection servers** — the registry is built once during initialisation and every connection registers its own surfaces from it.

## Installation

The package is not published to npm yet, so `npm install @clapp/ai-workflow-mcp` does not resolve until the first release. Until then it is consumed as a workspace package of the monorepo:

```bash
npm install @clapp/ai-workflow-mcp
```

## Usage

Register the server in an MCP client configuration:

```json
{
  "mcpServers": {
    "clapp-ai": {
      "command": "npx",
      "args": ["clapp-ai-mcp"]
    }
  }
}
```

The server speaks the protocol over stdio and writes diagnostics to stderr only, so stdout stays clean for the protocol stream. Inside the monorepo it runs from the sources without a build step:

```bash
npm run start:ai-mcp
npm run check:ai-mcp   # development check client of the repository
```

The entities a client sees, by surface:

| Surface   | Entities                                                                            |
| --------- | ----------------------------------------------------------------------------------- |
| Tools     | `init`, `skill/add`, `task/add`                                                      |
| Resources | `skill/list`, `task/list`, `task/todo`, `board/list`, `board/next`, `npm-info`        |
| Prompts   | `brief`                                                                              |

## Related packages

| Package                                                                     | Repository                                                                               |
| --------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| [`@clapp/common`](https://www.npmjs.com/package/@clapp/common)               | [`orion76/clapp-common`](https://github.com/orion76/clapp-common)                         |
| [`@clapp/core`](https://www.npmjs.com/package/@clapp/core)                   | [`orion76/clapp-core`](https://github.com/orion76/clapp-core)                             |
| [`@clapp/utils`](https://www.npmjs.com/package/@clapp/utils)                 | [`orion76/clapp-utils`](https://github.com/orion76/clapp-utils)                           |
| [`@clapp/ai-workflow-plugins`](https://www.npmjs.com/package/@clapp/ai-workflow-plugins) | [`orion76/clapp-ai-workflow-plugins`](https://github.com/orion76/clapp-ai-workflow-plugins) |
| [`@clapp/ai-workflow-cli`](https://www.npmjs.com/package/@clapp/ai-workflow-cli) | [`orion76/clapp-ai-workflow-cli`](https://github.com/orion76/clapp-ai-workflow-cli)       |

## License

MIT
