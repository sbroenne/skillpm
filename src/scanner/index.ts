import { readdir, access, lstat } from 'node:fs/promises';
import { join } from 'node:path';
import { readPackageJson } from '../manifest/index.js';
import type { SkillInfo } from '../manifest/schema.js';

/**
 * Return true if the given path is a symbolic link (or on Windows, a junction).
 * Does NOT follow the link — uses lstat so the link itself is inspected.
 */
async function isSymlink(p: string): Promise<boolean> {
  try {
    const s = await lstat(p);
    return s.isSymbolicLink();
  } catch {
    return false;
  }
}

/**
 * Scan node_modules/ for packages that contain a skills/<name>/SKILL.md file.
 * Also follows symlinks — npm workspace packages appear as symlinks inside
 * node_modules/ and are flagged with `workspace: true` on the returned SkillInfo.
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
      const scopeDir = join(nodeModulesDir, entry);
      let scopedEntries: string[];
      try {
        scopedEntries = await readdir(scopeDir);
      } catch {
        continue;
      }
      for (const scopedEntry of scopedEntries) {
        const pkgDir = join(scopeDir, scopedEntry);
        const symlink = await isSymlink(pkgDir);
        const skill = await tryReadSkill(pkgDir, symlink);
        if (skill) skills.push(skill);
      }
    } else {
      const pkgDir = join(nodeModulesDir, entry);
      const symlink = await isSymlink(pkgDir);
      const skill = await tryReadSkill(pkgDir, symlink);
      if (skill) skills.push(skill);
    }
  }

  return skills;
}

async function tryReadSkill(pkgDir: string, workspace = false): Promise<SkillInfo | null> {
  const pkg = await readPackageJson(pkgDir);
  if (!pkg) return null;

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

    return {
      name: pkg.name,
      version: pkg.version,
      path: pkgDir,
      skillDir,
      workspace: workspace || undefined,
    };
  }

  try {
    await access(join(pkgDir, 'SKILL.md'));
  } catch {
    return null;
  }

  return {
    name: pkg.name,
    version: pkg.version,
    path: pkgDir,
    skillDir: pkgDir,
    legacy: true,
    workspace: workspace || undefined,
  };
}
