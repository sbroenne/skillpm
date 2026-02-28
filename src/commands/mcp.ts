import { npx, log } from '../utils/index.js';

export async function mcp(
  subcommand: string,
  args: string[],
  cwd: string,
): Promise<void> {
  switch (subcommand) {
    case 'add': {
      if (args.length === 0) {
        log.error('Usage: skillpm mcp add <source>');
        process.exit(1);
      }
      for (const source of args) {
        log.info(`Configuring MCP server: ${source}`);
        try {
          await npx(['@sbroenne/add-mcp', source, '-y'], { cwd });
          log.success(`Configured ${source}`);
        } catch (err: unknown) {
          const msg = err instanceof Error ? err.message : String(err);
          log.error(`Failed to configure MCP server ${source}: ${msg}`);
        }
      }
      break;
    }
    case 'list': {
      log.info('Listing MCP servers is not yet supported by add-mcp.');
      log.info('Check your agent config files directly (.cursor/mcp.json, etc.)');
      break;
    }
    default:
      log.error(`Unknown mcp subcommand: ${subcommand}`);
      log.error('Usage: skillpm mcp <add|list> [args...]');
      process.exit(1);
  }
}
