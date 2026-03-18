import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtemp, mkdir, writeFile, rm, symlink } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { scanNodeModules } from './index.js';

describe('scanNodeModules', () => {
  let tmpDir: string;

  beforeEach(async () => {
    tmpDir = await mkdtemp(join(tmpdir(), 'skillpm-test-'));
  });

  afterEach(async () => {
    await rm(tmpDir, { recursive: true, force: true });
  });

  it('returns empty array when no node_modules exists', async () => {
    const result = await scanNodeModules(tmpDir);
    expect(result).toEqual([]);
  });

  it('returns empty array when no skills found', async () => {
    const pkgDir = join(tmpDir, 'node_modules', 'some-lib');
    await mkdir(pkgDir, { recursive: true });
    await writeFile(
      join(pkgDir, 'package.json'),
      JSON.stringify({ name: 'some-lib', version: '1.0.0' }),
    );
    const result = await scanNodeModules(tmpDir);
    expect(result).toEqual([]);
  });

  it('finds a skill package with skills/<name>/SKILL.md', async () => {
    const pkgDir = join(tmpDir, 'node_modules', 'my-skill');
    const skillDir = join(pkgDir, 'skills', 'my-skill');
    await mkdir(skillDir, { recursive: true });
    await writeFile(
      join(pkgDir, 'package.json'),
      JSON.stringify({ name: 'my-skill', version: '2.0.0' }),
    );
    await writeFile(
      join(skillDir, 'SKILL.md'),
      '---\nname: my-skill\ndescription: A test skill\n---\n# My Skill\n',
    );

    const result = await scanNodeModules(tmpDir);
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe('my-skill');
    expect(result[0].version).toBe('2.0.0');
    expect(result[0].skillDir).toBe(skillDir);
  });

  it('finds scoped skill packages', async () => {
    const pkgDir = join(tmpDir, 'node_modules', '@org', 'skill-a');
    const skillDir = join(pkgDir, 'skills', 'skill-a');
    await mkdir(skillDir, { recursive: true });
    await writeFile(
      join(pkgDir, 'package.json'),
      JSON.stringify({ name: '@org/skill-a', version: '1.0.0' }),
    );
    await writeFile(join(skillDir, 'SKILL.md'), '---\nname: skill-a\n---\n');

    const result = await scanNodeModules(tmpDir);
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe('@org/skill-a');
    expect(result[0].skillDir).toBe(skillDir);
  });

  it('detects root SKILL.md as legacy skill', async () => {
    const pkgDir = join(tmpDir, 'node_modules', 'old-skill');
    await mkdir(pkgDir, { recursive: true });
    await writeFile(
      join(pkgDir, 'package.json'),
      JSON.stringify({ name: 'old-skill', version: '1.0.0' }),
    );
    await writeFile(join(pkgDir, 'SKILL.md'), '---\nname: old-skill\n---\n');

    const result = await scanNodeModules(tmpDir);
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe('old-skill');
    expect(result[0].skillDir).toBe(pkgDir);
    expect(result[0].legacy).toBe(true);
  });

  it('prefers skills/<name>/SKILL.md over root SKILL.md', async () => {
    const pkgDir = join(tmpDir, 'node_modules', 'dual-skill');
    const skillDir = join(pkgDir, 'skills', 'dual-skill');
    await mkdir(skillDir, { recursive: true });
    await writeFile(
      join(pkgDir, 'package.json'),
      JSON.stringify({ name: 'dual-skill', version: '1.0.0' }),
    );
    await writeFile(join(pkgDir, 'SKILL.md'), '---\nname: dual-skill\n---\n');
    await writeFile(join(skillDir, 'SKILL.md'), '---\nname: dual-skill\n---\n');

    const result = await scanNodeModules(tmpDir);
    expect(result).toHaveLength(1);
    expect(result[0].skillDir).toBe(skillDir);
    expect(result[0].legacy).toBeUndefined();
  });
});

describe('workspace package (symlink) detection', () => {
  let tmpDir: string;

  beforeEach(async () => {
    tmpDir = await mkdtemp(join(tmpdir(), 'skillpm-workspace-'));
  });

  afterEach(async () => {
    await rm(tmpDir, { recursive: true, force: true });
  });

  it('sets workspace: true for a symlinked (workspace) skill package', async () => {
    const realPkgDir = join(tmpDir, 'skills', 'my-skill');
    const skillDir = join(realPkgDir, 'skills', 'my-skill');
    await mkdir(skillDir, { recursive: true });
    await writeFile(
      join(realPkgDir, 'package.json'),
      JSON.stringify({ name: 'my-skill', version: '1.0.0' }),
    );
    await writeFile(join(skillDir, 'SKILL.md'), '---\nname: my-skill\ndescription: Test\n---\n');

    const nodeModulesDir = join(tmpDir, 'node_modules');
    await mkdir(nodeModulesDir, { recursive: true });
    await symlink(realPkgDir, join(nodeModulesDir, 'my-skill'), 'junction');

    const result = await scanNodeModules(tmpDir);
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe('my-skill');
    expect(result[0].workspace).toBe(true);
  });

  it('does NOT set workspace: true for a regular (non-symlinked) package', async () => {
    const pkgDir = join(tmpDir, 'node_modules', 'regular-skill');
    const skillDir = join(pkgDir, 'skills', 'regular-skill');
    await mkdir(skillDir, { recursive: true });
    await writeFile(
      join(pkgDir, 'package.json'),
      JSON.stringify({ name: 'regular-skill', version: '1.0.0' }),
    );
    await writeFile(join(skillDir, 'SKILL.md'), '---\nname: regular-skill\n---\n');

    const result = await scanNodeModules(tmpDir);
    expect(result).toHaveLength(1);
    expect(result[0].workspace).toBeUndefined();
  });

  it('sets workspace: true for a scoped symlinked package', async () => {
    const realPkgDir = join(tmpDir, 'skills', 'skill-a');
    const skillDir = join(realPkgDir, 'skills', 'skill-a');
    await mkdir(skillDir, { recursive: true });
    await writeFile(
      join(realPkgDir, 'package.json'),
      JSON.stringify({ name: '@org/skill-a', version: '1.0.0' }),
    );
    await writeFile(join(skillDir, 'SKILL.md'), '---\nname: skill-a\n---\n');

    const scopeDir = join(tmpDir, 'node_modules', '@org');
    await mkdir(scopeDir, { recursive: true });
    await symlink(realPkgDir, join(scopeDir, 'skill-a'), 'junction');

    const result = await scanNodeModules(tmpDir);
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe('@org/skill-a');
    expect(result[0].workspace).toBe(true);
  });
});
