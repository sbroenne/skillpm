import { npm, npx, log } from '../utils/index.js';
import { scanNodeModules, collectMcpServers } from '../scanner/index.js';

export async function install(args: string[], cwd: string): Promise<void> {
  // Reject global installs — skillpm is workspace-only
  if (args.includes('-g') || args.includes('--global')) {
    log.error('Global installs are not supported. skillpm works per-workspace with package.json and lockfiles.');
    log.error('For global skills, use: npx skills add <path>');
    process.exit(1);
  }

  // Step 1: npm install
  const npmArgs = ['install', ...args];
  log.info(`Running npm ${npmArgs.join(' ')}`);
  try {
    const result = await npm(npmArgs, { cwd });
    if (result.stderr) process.stderr.write(result.stderr);
    if (result.stdout) process.stdout.write(result.stdout);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    log.error(`npm install failed: ${msg}`);
    process.exit(1);
  }

  // Step 2: Scan for skills and wire them
  await wireSkills(cwd);
}

export async function wireSkills(cwd: string): Promise<void> {
  // Scan node_modules/ for SKILL.md packages
  const skills = await scanNodeModules(cwd);

  if (skills.length === 0) {
    log.info('No skill packages found in node_modules/');
    return;
  }

  log.info(`Found ${skills.length} skill package(s)`);

  // Wire each skill into agent directories via skills CLI
  for (const skill of skills) {
    log.info(`Linking ${log.skill(skill.name, skill.version)} into agent directories`);
    try {
      await npx(['skills', 'add', skill.skillDir, '--all', '-y'], { cwd });
      log.success(`Linked ${skill.name}`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      log.warn(`Failed to link ${skill.name}: ${msg}`);
    }
    if (skill.legacy) {
      log.warn(
        `${skill.name}: SKILL.md is at package root. Move to skills/<name>/SKILL.md for full compatibility. See https://skillpm.dev/creating-skills/`,
      );
    }
  }

  // Collect and configure MCP servers
  const mcpServers = collectMcpServers(skills);
  if (mcpServers.length > 0) {
    log.info(`Configuring ${mcpServers.length} MCP server(s)`);
    for (const server of mcpServers) {
      log.info(`Configuring MCP server: ${server}`);
      try {
        await npx(['add-mcp', server, '-y'], { cwd });
        log.success(`Configured ${server}`);
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        log.warn(`Failed to configure MCP server ${server}: ${msg}`);
      }
    }
  }

  // Wire agent definitions via add-custom-agent
  for (const skill of skills) {
    for (const agentFile of skill.agents) {
      log.info(`Wiring agent from ${log.skill(skill.name, skill.version)}`);
      try {
        await npx(['add-custom-agent', agentFile, '--package', skill.name], { cwd });
        log.success(`Wired agent ${agentFile}`);
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        log.warn(`Failed to wire agent: ${msg}`);
      }
    }
  }

  // Wire prompts/instructions via add-custom-prompt
  for (const skill of skills) {
    for (const promptFile of skill.prompts) {
      log.info(`Wiring prompt from ${log.skill(skill.name, skill.version)}`);
      try {
        await npx(['add-custom-prompt', promptFile, '--package', skill.name], { cwd });
        log.success(`Wired prompt ${promptFile}`);
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        log.warn(`Failed to wire prompt: ${msg}`);
      }
    }
  }
}
