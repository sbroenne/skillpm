import { readdir, access } from 'node:fs/promises';
import { join } from 'node:path';
import { npm, npx, log } from '../utils/index.js';
import { readPackageJson } from '../manifest/index.js';

/**
 * Validate a skill package is ready to publish.
 * Returns an array of error messages (empty = valid).
 */
export async function validatePublish(cwd: string): Promise<string[]> {
  const errors: string[] = [];

  // 1. Check package.json exists and has required fields
  const pkg = await readPackageJson(cwd);
  if (!pkg) {
    return ['No package.json found. Run "skillpm init" or "npm init" first.'];
  }

  if (!pkg.keywords || !pkg.keywords.includes('agent-skill')) {
    errors.push(
      'package.json must include "agent-skill" in keywords. Add it manually or run "skillpm init".',
    );
  }

  // 2. Find skills/<name>/SKILL.md
  const skillsDir = join(cwd, 'skills');
  let skillSubdirs: string[] = [];
  try {
    skillSubdirs = await readdir(skillsDir);
  } catch {
    errors.push(
      'No skills/ directory found. Create skills/<name>/SKILL.md with your skill definition.',
    );
    return errors;
  }

  let foundSkillDir: string | null = null;
  for (const sub of skillSubdirs) {
    const candidate = join(skillsDir, sub);
    try {
      await access(join(candidate, 'SKILL.md'));
      foundSkillDir = candidate;
      break;
    } catch {
      continue;
    }
  }

  if (!foundSkillDir) {
    errors.push(
      'No SKILL.md found in skills/ subdirectories. Create skills/<name>/SKILL.md.',
    );
    return errors;
  }

  // 3. Validate against the Agent Skills spec via skills-ref
  try {
    await npx(['skills-ref', 'validate', foundSkillDir]);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    errors.push(`SKILL.md spec validation failed: ${msg}`);
  }

  return errors;
}

export async function publish(args: string[], cwd: string): Promise<void> {
  const errors = await validatePublish(cwd);

  if (errors.length > 0) {
    log.error('Publish validation failed:');
    for (const err of errors) {
      log.error(`  • ${err}`);
    }
    process.exit(1);
  }

  log.info('Publishing to npmjs.org...');
  try {
    const result = await npm(['publish', ...args], { cwd });
    if (result.stderr) process.stderr.write(result.stderr);
    if (result.stdout) process.stdout.write(result.stdout);
    log.success('Published');
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    log.error(`npm publish failed: ${msg}`);
    process.exit(1);
  }
}
