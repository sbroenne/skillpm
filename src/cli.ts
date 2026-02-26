#!/usr/bin/env node

import { install } from './commands/install.js';
import { uninstall } from './commands/uninstall.js';
import { list } from './commands/list.js';
import { init } from './commands/init.js';
import { publish } from './commands/publish.js';
import { sync } from './commands/sync.js';
import { mcp } from './commands/mcp.js';
import { log } from './utils/index.js';

const VERSION = '0.0.3';

const HELP = `
skillpm — Agent Skill package manager

Usage:
  skillpm install [skill...]     Install skill(s) + wire into agent directories
  skillpm uninstall <skill...>   Remove skill(s) and clean up
  skillpm list                   List installed skill packages
  skillpm init                   Scaffold a new skill package
  skillpm publish [args...]      Publish to npmjs.org (wraps npm publish)
  skillpm sync                   Re-wire agent directories without reinstalling
  skillpm mcp add <source...>    Configure MCP server(s) across agents
  skillpm mcp list               List configured MCP servers
  skillpm --help                 Show this help
  skillpm --version              Show version
`;

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const cwd = process.cwd();

  if (args.length === 0 || args.includes('--help') || args.includes('-h')) {
    console.log(HELP.trim());
    return;
  }

  if (args.includes('--version') || args.includes('-v')) {
    console.log(VERSION);
    return;
  }

  const command = args[0];
  const rest = args.slice(1);

  switch (command) {
    case 'install':
    case 'i':
      await install(rest, cwd);
      break;
    case 'uninstall':
    case 'remove':
    case 'rm':
      await uninstall(rest, cwd);
      break;
    case 'list':
    case 'ls':
      await list(cwd);
      break;
    case 'init':
      await init(cwd);
      break;
    case 'publish':
      await publish(rest, cwd);
      break;
    case 'sync':
      await sync(cwd);
      break;
    case 'mcp':
      if (rest.length === 0) {
        log.error('Usage: skillpm mcp <add|list> [args...]');
        process.exit(1);
      }
      await mcp(rest[0], rest.slice(1), cwd);
      break;
    default:
      log.error(`Unknown command: ${command}`);
      console.log(HELP.trim());
      process.exit(1);
  }
}

main().catch((err) => {
  log.error(err.message);
  process.exit(1);
});
