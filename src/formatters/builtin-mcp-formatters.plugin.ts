/**
 * Re-export of the MCP formatters of `@clapp/core` for plugin discovery.
 *
 * The MCP formatters ship with the core, but the discovery loader only finds modules that
 * exist as separate files under the application root: the built `@clapp/core` is a single
 * bundle (`dist/clapp-core.js`), so a glob pattern cannot match the formatter modules inside
 * it. This module gives the host a per-file plugin module in both modes — `src/formatters/**`
 * in development and `dist/formatters/**` after `tsc` — while the exported classes and their
 * `@NodePlugin` definitions stay the ones of the core.
 *
 * There is no separate plugin type or manager for MCP: the set is selected only by pointing
 * the `PLUGIN_FORMATTER` discovery pattern of `clapp.config.yml` at these modules, so the
 * server resolves the `table`/`ordered-list`/`key-value` identifiers in the MCP set and has
 * no fallback to the terminal one.
 */
export { MCPKeyValueFormatterPlugin, MCPOrderedListFormatterPlugin, MCPTableFormatterPlugin } from '@clapp/core';
