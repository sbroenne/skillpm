import { scanNodeModules } from '../scanner/index.js';
import { readSkillMd } from '../manifest/index.js';
import { log } from '../utils/index.js';

export async function list(args: string[], cwd: string): Promise<void> {
  const jsonOutput = args.includes('--json');
  const skills = await scanNodeModules(cwd);

  if (jsonOutput) {
    const items = [];
    for (const skill of skills) {
      const frontmatter = await readSkillMd(skill.skillDir);
      items.push({
        name: skill.name,
        version: skill.version,
        description: frontmatter?.description ?? '',
        ...(skill.legacy ? { legacy: true } : {}),
        ...(skill.workspace ? { workspace: true } : {}),
      });
    }
    console.log(JSON.stringify(items, null, 2));
    return;
  }

  if (skills.length === 0) {
    log.info('No skill packages installed');
    return;
  }

  console.log(`
${skills.length} skill package(s) installed:
`);

  for (const skill of skills) {
    const frontmatter = await readSkillMd(skill.skillDir);
    const description = frontmatter?.description ?? '';
    const legacyTag = skill.legacy ? ' (legacy)' : '';
    console.log(`  ${log.skill(skill.name, skill.version)}${legacyTag}`);
    if (description) {
      console.log(`    ${description}`);
    }
  }
  console.log();
}
