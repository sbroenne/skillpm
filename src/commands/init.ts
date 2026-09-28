import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import { npm, log } from '../utils/index.js';
import { readPackageJson } from '../manifest/index.js';

export async function init(cwd: string): Promise<void> {
  // Run npm init
  log.info('Initializing package...');
  try {
    await npm(['init', '-y'], { cwd });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    log.error(`npm init failed: ${msg}`);
    process.exit(1);
  }

  // Read the generated package.json to add "agent-skill" keyword
  const pkgPath = join(cwd, 'package.json');
  const pkg = await readPackageJson(cwd);
  const name = pkg?.name ?? 'my-skill';

  // npm names allow dots and underscores; skill names do not.
  const skillName = name
    .replace(/^@[^/]+\//, '')
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 64)
    .replace(/-$/, '');
  if (!skillName) {
    throw new Error(
      'Cannot derive a skill name from package.json. Use a package name containing letters or numbers.',
    );
  }

  // Add "agent-skill" keyword to package.json
  const rawPkg = JSON.parse(await readFile(pkgPath, 'utf-8'));
  const keywords: string[] = rawPkg.keywords ?? [];
  if (!keywords.includes('agent-skill')) {
    keywords.push('agent-skill');
  }
  rawPkg.keywords = keywords;
  if (Array.isArray(rawPkg.files) && !rawPkg.files.includes('skills')) {
    rawPkg.files.push('skills');
  }
  await writeFile(pkgPath, JSON.stringify(rawPkg, null, 2) + '\n', 'utf-8');

  // Create skills/<name>/SKILL.md
  const skillDir = join(cwd, 'skills', skillName);
  await mkdir(skillDir, { recursive: true });

  const skillMd = `---
name: ${JSON.stringify(skillName)}
description: TODO — describe what this skill does and when to use it.
---

# ${skillName}

## When to use this skill

TODO

## Instructions

TODO
`;

  try {
    await writeFile(join(skillDir, 'SKILL.md'), skillMd, {
      encoding: 'utf-8',
      flag: 'wx',
    });
  } catch (err: unknown) {
    if (
      typeof err === 'object' &&
      err !== null &&
      'code' in err &&
      err.code === 'EEXIST'
    ) {
      log.info(`Keeping existing skills/${skillName}/SKILL.md`);
      return;
    }
    throw err;
  }
  log.success(`Created skills/${skillName}/SKILL.md`);
  log.success(
    `Skill package initialized. Edit skills/${skillName}/SKILL.md to define your skill.`,
  );
}
