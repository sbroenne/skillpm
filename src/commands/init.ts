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

  // Add "agent-skill" keyword to package.json
  const rawPkg = JSON.parse(await readFile(pkgPath, 'utf-8'));
  const keywords: string[] = rawPkg.keywords ?? [];
  if (!keywords.includes('agent-skill')) {
    keywords.push('agent-skill');
  }
  rawPkg.keywords = keywords;
  await writeFile(pkgPath, JSON.stringify(rawPkg, null, 2) + '\n', 'utf-8');

  // Create skills/<name>/SKILL.md
  const skillName = name.replace(/^@[^/]+\//, ''); // strip scope for dir name
  const skillDir = join(cwd, 'skills', skillName);
  await mkdir(skillDir, { recursive: true });

  const skillMd = `---
name: ${skillName}
description: TODO — describe what this skill does and when to use it.
---

# ${skillName}

## When to use this skill

TODO

## Instructions

TODO
`;

  await writeFile(join(skillDir, 'SKILL.md'), skillMd, 'utf-8');
  log.success(`Created skills/${skillName}/SKILL.md`);
  log.success(`Skill package initialized. Edit skills/${skillName}/SKILL.md to define your skill.`);
}
