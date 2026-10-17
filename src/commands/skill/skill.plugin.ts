import { injectable } from 'inversify';
import { NodePlugin } from '@orion76/node-plugin';

import {
  COMMAND_KIND_GROUP,
  type ICommandResult,
  type IPluginCommandDefinitionData,
  PLUGIN_COMMAND_TYPE,
  PluginCommandBase,
} from '@clapp/command';

/**
 * Command group `skill`: the path prefix of the `skill/*` MCP entities.
 *
 * The group only contributes its id to the path of its subcommands, so the resource
 * `skill/list` and the tool `skill/add` are built from it. It carries no options of its own
 * and has no MCP surface: the engine walks a node with children as a container and never
 * exposes the group itself, so no `skill` entry appears in `resources/list`, `tools/list` or
 * `prompts/list`.
 */
@NodePlugin<IPluginCommandDefinitionData<{}>>({
  type: PLUGIN_COMMAND_TYPE,
  kind: COMMAND_KIND_GROUP,
  id: 'skill',
  label: 'Work with opencode skills',
  config: {},
})
@injectable()
export class SkillCommandPlugin extends PluginCommandBase<{}> {
  /**
   * Unreachable defensive fallback.
   *
   * `PluginCommandBase` declares the action abstract, while the MCP engine registers a
   * handler for leaf commands only: a node with children never gets a callable entity, so
   * this method is not reachable through the protocol. It is kept to make the group
   * implementation explicit and would only run if the core ever attached a handler to
   * group nodes.
   * @returns Failure result naming the available subcommands
   */
  async action(): Promise<ICommandResult> {
    return { success: false, error: ['Specify a subcommand: list | add'] };
  }
}
