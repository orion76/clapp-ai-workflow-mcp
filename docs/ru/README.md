> ⚠️ **В разработке.** Пакет ещё не готов к релизу: релиз ожидается в ближайшее время, API может меняться. Использовать в продакшне пока нельзя.

[English](../README.md)

# @clapp/ai-workflow-mcp

MCP-сервер `clapp-ai-mcp` для workflow разработки с ИИ: те же плагины команд, что и у CLI `clapp-ai`, выставленные через Model Context Protocol посредством `MCPEngine` из `@clapp/core`. Пакет — тонкий хост монорепозитория [`orion76/clapp`](https://github.com/orion76/clapp): собственных команд у него нет, только `bin`, свой `clapp.config.yml` и те источники плагинов, которые этот конфиг объявляет.

## Возможности

- **bin `clapp-ai-mcp`** — сервер, который инициализирует приложение, загружает свой `clapp.config.yml` и отдаёт команды по транспорту stdio.
- **Набор плагинов workflow** — `init`, `skill add`, `skill list`, `task add`, `task list`, `task todo`, `board list`, `board next`, `npm-info` и подсказка `brief` приходят из `@clapp/ai-workflow-plugins`.
- **Поверхность по виду команды** — `kind: tool` становится инструментом MCP, `kind: resource` — ресурсом MCP, `kind: prompt` — подсказкой MCP; узел-группа только даёт префикс пути своим подкомандам.
- **Стабильные имена сущностей** — сущность адресуется путём команды в иерархии (`task/list`, `board/next`), а её аргументы и опции описываются схемой, сгенерированной из определения команды.
- **Тот же отрендеренный текст, что и в CLI** — результат проходит через форматтер, объявленный командой, поэтому клиент получает текст, который напечатал бы CLI.
- **Явное сообщение о том, что не выставлено** — команда без объявленного форматтера не попадает в реестр и сообщается в stderr, а не исчезает молча.
- **Серверы на каждое соединение** — реестр строится один раз при инициализации, и каждое соединение регистрирует из него свои поверхности.

## Установка

Пакет ещё не опубликован в npm, поэтому `npm install @clapp/ai-workflow-mcp` ничего не установит до первого релиза. До этого пакет используется как workspace-пакет монорепозитория:

```bash
npm install @clapp/ai-workflow-mcp
```

## Использование

Зарегистрируйте сервер в конфигурации MCP-клиента:

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

Сервер говорит по протоколу через stdio и пишет диагностику только в stderr, поэтому stdout остаётся чистым для потока протокола. Внутри монорепозитория он запускается из исходников без шага сборки:

```bash
npm run start:ai-mcp
npm run check:ai-mcp   # development check client of the repository
```

Сущности, которые видит клиент, по поверхностям:

| Поверхность | Сущности                                                                           |
| ----------- | ----------------------------------------------------------------------------------- |
| Инструменты | `init`, `skill/add`, `task/add`                                                      |
| Ресурсы     | `skill/list`, `task/list`, `task/todo`, `board/list`, `board/next`, `npm-info`        |
| Подсказки   | `brief`                                                                              |

## Связанные пакеты

| Пакет                                                                       | Репозиторий                                                                              |
| --------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| [`@clapp/common`](https://www.npmjs.com/package/@clapp/common)               | [`orion76/clapp-common`](https://github.com/orion76/clapp-common)                         |
| [`@clapp/core`](https://www.npmjs.com/package/@clapp/core)                   | [`orion76/clapp-core`](https://github.com/orion76/clapp-core)                             |
| [`@clapp/utils`](https://www.npmjs.com/package/@clapp/utils)                 | [`orion76/clapp-utils`](https://github.com/orion76/clapp-utils)                           |
| [`@clapp/ai-workflow-plugins`](https://www.npmjs.com/package/@clapp/ai-workflow-plugins) | [`orion76/clapp-ai-workflow-plugins`](https://github.com/orion76/clapp-ai-workflow-plugins) |
| [`@clapp/ai-workflow-cli`](https://www.npmjs.com/package/@clapp/ai-workflow-cli) | [`orion76/clapp-ai-workflow-cli`](https://github.com/orion76/clapp-ai-workflow-cli)       |

## Лицензия

MIT
