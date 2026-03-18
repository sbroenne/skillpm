import { npm, npx, log } from '../utils/index.js';
import { scanNodeModules } from '../scanner/index.js';

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
  const skills = await scanNodeModules(cwd);

  if (skills.length === 0) {
    log.info('No skill packages found in node_modules/');
    return;
  }

  log.info(`Found ${skills.length} skill package(s)`);

  // Wire each skill into agent directories via skills CLI
  for (const skill of skills) {
    const label = skill.workspace ? `workspace package ${log.skill(skill.name, skill.version)}` : log.skill(skill.name, skill.version);
    log.info(`Linking ${label} into agent directories`);
    try {
      await npx(['skills', 'add', skill.skillDir, '-y'], { cwd });
      log.success(`Linked ${skill.name}`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      log.warn(`Failed to link ${skill.name}: ${msg}`);
    }
    if (skill.legacy && !skill.workspace) {
      log.warn(
        `${skill.name}: SKILL.md is at package root. Move to skills/<name>/SKILL.md for full compatibility. See https://skillpm.dev/creating-skills/`,
      );
    }
  }
}
