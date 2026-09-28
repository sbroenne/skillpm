import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { mkdtemp, mkdir, readFile, writeFile, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { init } from './init.js';
import { readSkillMd } from '../manifest/index.js';

vi.mock('../utils/index.js', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../utils/index.js')>()),
  npm: vi.fn().mockResolvedValue({ stdout: '', stderr: '' }),
}));

describe('init', () => {
  let cwd: string;

  beforeEach(async () => {
    cwd = await mkdtemp(join(tmpdir(), 'skillpm-init-'));
  });

  afterEach(async () => {
    await rm(cwd, { recursive: true, force: true });
  });

  it.each([
    ['@org/my.skill_name', 'my-skill-name'],
    ['some---skill', 'some-skill'],
    ['a'.repeat(63) + '-rest', 'a'.repeat(63)],
    ['a'.repeat(100), 'a'.repeat(64)],
    ['123', '123'],
    ['null', 'null'],
  ])('scaffolds a spec-compatible name for %s', async (name, expected) => {
    await writeFile(
      join(cwd, 'package.json'),
      JSON.stringify({ name, files: ['dist'] }),
    );
    await init(cwd);
    const frontmatter = await readSkillMd(join(cwd, 'skills', expected));
    expect(frontmatter?.name).toBe(expected);
    const pkg = JSON.parse(await readFile(join(cwd, 'package.json'), 'utf-8'));
    expect(pkg.name).toBe(name);
    expect(pkg.keywords).toContain('agent-skill');
    expect(pkg.files).toEqual(['dist', 'skills']);
  });

  it('preserves existing skill instructions and keywords', async () => {
    await writeFile(
      join(cwd, 'package.json'),
      JSON.stringify({
        name: 'existing',
        keywords: ['custom', 'agent-skill'],
        files: ['skills'],
      }),
    );
    const dir = join(cwd, 'skills', 'existing');
    await mkdir(dir, { recursive: true });
    const content =
      '---\nname: existing\ndescription: Keep me\n---\nCustom instructions\n';
    await writeFile(join(dir, 'SKILL.md'), content);
    await init(cwd);
    expect(await readFile(join(dir, 'SKILL.md'), 'utf-8')).toBe(content);
    const pkg = JSON.parse(await readFile(join(cwd, 'package.json'), 'utf-8'));
    expect(pkg.keywords).toEqual(['custom', 'agent-skill']);
    expect(pkg.files).toEqual(['skills']);
  });

  it('fails explicitly if the npm name cannot produce a skill name', async () => {
    await writeFile(join(cwd, 'package.json'), JSON.stringify({ name: '...' }));
    await expect(init(cwd)).rejects.toThrow('Cannot derive a skill name');
  });
});
