import { npm, npx, log, SKILLS_CLI, execErrorMessage } from '../utils/index.js';
import { scanNodeModules } from '../scanner/index.js';
import { readSkillMd } from '../manifest/index.js';

export async function install(args: string[], cwd: string): Promise<void> {
  // Reject global installs — skillpm is workspace-only
  if (args.includes('-g') || args.includes('--global')) {
    log.error(
      'Global installs are not supported. skillpm works per-workspace with package.json and lockfiles.',
    );
    log.error(`For global skills, use: npx ${SKILLS_CLI} add <path> --global`);
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

  // Agent directories are keyed by the SKILL.md name, not the npm package name.
  const owners = new Map<string, string>();
  for (const skill of skills) {
    const frontmatter = await readSkillMd(skill.skillDir);
    const name = frontmatter?.name;
    if (typeof name !== 'string' || !name.trim()) {
      throw new Error(`${skill.name}: SKILL.md must contain a non-empty name.`);
    }
    const owner = owners.get(name);
    if (owner) {
      throw new Error(
        `Skill name "${name}" is provided by both ${owner} and ${skill.skillDir}. ` +
          'Use unique skill names or deduplicate the npm dependency tree before linking.',
      );
    }
    owners.set(name, skill.skillDir);
  }

  const failures: string[] = [];
  // Wire each skill into agent directories via skills CLI
  for (const skill of skills) {
    const label = skill.workspace
      ? `workspace package ${log.skill(skill.name, skill.version)}`
      : log.skill(skill.name, skill.version);
    log.info(`Linking ${label} into agent directories`);
    try {
      const result = await npx(
        [SKILLS_CLI, 'add', skill.skillDir, '-y', '--json'],
        { cwd },
      );
      if (result.stderr) process.stderr.write(result.stderr);
      const entries: unknown = JSON.parse(result.stdout);
      if (
        !Array.isArray(entries) ||
        entries.length !== 1 ||
        !entries.every(
          (entry: unknown) =>
            typeof entry === 'object' &&
            entry !== null &&
            'status' in entry &&
            entry.status === 'installed' &&
            'scope' in entry &&
            entry.scope === 'project',
        )
      ) {
        throw new Error(
          `skills did not confirm a project installation: ${result.stdout}`,
        );
      }
      log.success(`Linked ${skill.name}`);
    } catch (err: unknown) {
      failures.push(skill.name);
      log.error(`Failed to link ${skill.name}: ${execErrorMessage(err)}`);
    }
    if (skill.legacy && !skill.workspace) {
      log.warn(
        `${skill.name}: SKILL.md is at package root. Move to skills/<name>/SKILL.md for full compatibility. See https://skillpm.dev/creating-skills/`,
      );
    }
  }
  if (failures.length > 0) {
    throw new Error(
      `Failed to link ${failures.length} skill package(s): ${failures.join(', ')}. ` +
        'Fix the errors above, then run "skillpm sync".',
    );
  }
}
