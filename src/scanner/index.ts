import { readdir, access } from 'node:fs/promises';
import { join } from 'node:path';
import { readPackageJson, parseSkillpmField } from '../manifest/index.js';
import type { SkillInfo } from '../manifest/schema.js';

/**
 * Scan node_modules/ for packages that contain a skills/<name>/SKILL.md file.
 * Returns metadata for each discovered skill package.
 */
export async function scanNodeModules(cwd: string): Promise<SkillInfo[]> {
  const nodeModulesDir = join(cwd, 'node_modules');
  const skills: SkillInfo[] = [];

  let entries: string[];
  try {
    entries = await readdir(nodeModulesDir);
  } catch {
    return skills;
  }

  for (const entry of entries) {
    if (entry.startsWith('.')) continue;

    if (entry.startsWith('@')) {
      // Scoped package — scan one level deeper
      const scopeDir = join(nodeModulesDir, entry);
      let scopedEntries: string[];
      try {
        scopedEntries = await readdir(scopeDir);
      } catch {
        continue;
      }
      for (const scopedEntry of scopedEntries) {
        const pkgDir = join(scopeDir, scopedEntry);
        const skill = await tryReadSkill(pkgDir);
        if (skill) skills.push(skill);
      }
    } else {
      const pkgDir = join(nodeModulesDir, entry);
      const skill = await tryReadSkill(pkgDir);
      if (skill) skills.push(skill);
    }
  }

  return skills;
}

async function hasDir(dir: string): Promise<boolean> {
  try {
    await access(dir);
    return true;
  } catch {
    return false;
  }
}

async function tryReadSkill(pkgDir: string): Promise<SkillInfo | null> {
  const pkg = await readPackageJson(pkgDir);
  if (!pkg) return null;

  // Check for wiring/ directory
  const wiringDir = join(pkgDir, 'wiring');
  const hasWiring = await hasDir(wiringDir);

  // Preferred: look for skills/*/SKILL.md
  const skillsDir = join(pkgDir, 'skills');
  let skillSubdirs: string[];
  try {
    skillSubdirs = await readdir(skillsDir);
  } catch {
    skillSubdirs = [];
  }

  for (const sub of skillSubdirs) {
    const skillDir = join(skillsDir, sub);
    try {
      await access(join(skillDir, 'SKILL.md'));
    } catch {
      continue;
    }

    const skillpm = parseSkillpmField(pkg);
    return {
      name: pkg.name,
      version: pkg.version,
      path: pkgDir,
      skillDir,
      mcpServers: skillpm?.mcpServers ?? [],
      wiringDir: hasWiring ? wiringDir : undefined,
    };
  }

  // Fallback: root SKILL.md (legacy format)
  try {
    await access(join(pkgDir, 'SKILL.md'));
  } catch {
    return null;
  }

  const skillpm = parseSkillpmField(pkg);
  return {
    name: pkg.name,
    version: pkg.version,
    path: pkgDir,
    skillDir: pkgDir,
    mcpServers: skillpm?.mcpServers ?? [],
    legacy: true,
    wiringDir: hasWiring ? wiringDir : undefined,
  };
}

/**
 * Collect all MCP server requirements from all discovered skills (transitive).
 * Deduplicates entries.
 */
export function collectMcpServers(skills: SkillInfo[]): string[] {
  const servers = new Set<string>();
  for (const skill of skills) {
    for (const server of skill.mcpServers) {
      servers.add(server);
    }
  }
  return [...servers];
}
