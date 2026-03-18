import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import matter from 'gray-matter';
import type { SkillPackageJson } from './schema.js';

export async function readPackageJson(
  pkgDir: string,
): Promise<SkillPackageJson | null> {
  try {
    const raw = await readFile(join(pkgDir, 'package.json'), 'utf-8');
    return JSON.parse(raw) as SkillPackageJson;
  } catch {
    return null;
  }
}

export interface SkillMdFrontmatter {
  name: string;
  description: string;
  license?: string;
  compatibility?: string;
  metadata?: Record<string, unknown>;
  'allowed-tools'?: string;
}

export async function readSkillMd(
  skillDir: string,
): Promise<SkillMdFrontmatter | null> {
  try {
    const raw = await readFile(join(skillDir, 'SKILL.md'), 'utf-8');
    const { data } = matter(raw);
    return data as SkillMdFrontmatter;
  } catch {
    return null;
  }
}
