#!/usr/bin/env node

import { createRequire } from 'node:module';
import { install } from './commands/install.js';
import { uninstall } from './commands/uninstall.js';
import { list } from './commands/list.js';
import { init } from './commands/init.js';
import { publish } from './commands/publish.js';
import { sync } from './commands/sync.js';
import { mcp } from './commands/mcp.js';
import { npm, log } from './utils/index.js';

const require = createRequire(import.meta.url);
const { version: VERSION } = require('../package.json') as { version: string };

const HELP = `
skillpm — Agent Skill package manager

Usage:
  skillpm install [skill...]     Install skill(s) + wire into agent directories
  skillpm uninstall <skill...>   Remove skill(s) and clean up
  skillpm list [--json]          List installed skill packages
  skillpm init                   Scaffold a new skill package
  skillpm publish [args...]      Publish to npmjs.org (wraps npm publish)
  skillpm sync                   Re-wire agent directories without reinstalling
  skillpm mcp add <source...>    Configure MCP server(s) across agents
  skillpm mcp list               List configured MCP servers
  skillpm <npm-command> [args]   Any other command is passed through to npm
  skillpm --help                 Show this help
  skillpm --version              Show version
`;

// Commands handled by skillpm (not passed through to npm)
const SKILLPM_COMMANDS = new Set([
  'install', 'i', 'add',
  'uninstall', 'remove', 'rm',
  'list', 'ls',
  'init',
  'publish',
  'sync',
  'mcp',
]);

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const cwd = process.cwd();

  // Show help only when no command is given, or --help is the only arg
  if (args.length === 0 || (args.length === 1 && (args[0] === '--help' || args[0] === '-h'))) {
    console.log(HELP.trim());
    return;
  }

  if (args.length === 1 && (args[0] === '--version' || args[0] === '-v')) {
    console.log(VERSION);
    return;
  }

  const command = args[0];
  const rest = args.slice(1);

  // For skillpm commands, handle --help by showing skillpm help
  if (SKILLPM_COMMANDS.has(command) && (rest.includes('--help') || rest.includes('-h'))) {
    console.log(HELP.trim());
    return;
  }

  switch (command) {
    case 'install':
    case 'i':
    case 'add':
      await install(rest, cwd);
      break;
    case 'uninstall':
    case 'remove':
    case 'rm':
      await uninstall(rest, cwd);
      break;
    case 'list':
    case 'ls':
      await list(rest, cwd);
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
    default: {
      // Pass unknown commands through to npm
      const npmArgs = [command, ...rest];
      try {
        const result = await npm(npmArgs, { cwd });
        if (result.stdout) process.stdout.write(result.stdout);
        if (result.stderr) process.stderr.write(result.stderr);
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        // npm errors include their own output — just forward stderr
        if (typeof err === 'object' && err !== null && 'stderr' in err) {
          const stderr = (err as { stderr: string }).stderr;
          if (stderr) process.stderr.write(stderr);
        } else {
          log.error(`npm ${command} failed: ${msg}`);
        }
        process.exit(1);
      }
      break;
    }
  }
}

main().catch((err) => {
  log.error(err.message);
  process.exit(1);
});
