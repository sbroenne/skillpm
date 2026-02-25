import { scanNodeModules } from '../scanner/index.js';
import { readSkillMd } from '../manifest/index.js';
import { log } from '../utils/index.js';

export async function list(cwd: string): Promise<void> {
  const skills = await scanNodeModules(cwd);

  if (skills.length === 0) {
    log.info('No skill packages installed');
    return;
  }

  console.log(`\n${skills.length} skill package(s) installed:\n`);

  for (const skill of skills) {
    const frontmatter = await readSkillMd(skill.skillDir);
    const description = frontmatter?.description ?? '';
    const legacyTag = skill.legacy ? ' (legacy)' : '';
    console.log(`  ${log.skill(skill.name, skill.version)}${legacyTag}`);
    if (description) {
      console.log(`    ${description}`);
    }
    if (skill.mcpServers.length > 0) {
      console.log(`    MCP servers: ${skill.mcpServers.join(', ')}`);
    }
  }
  console.log();
}
