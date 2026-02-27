import { describe, it, expect, vi, beforeEach } from 'vitest';
import { validatePublish } from './publish.js';
import { mkdtemp, writeFile, mkdir, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

vi.mock('../utils/index.js', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../utils/index.js')>();
  return {
    ...actual,
    npx: vi.fn().mockResolvedValue({ stdout: '', stderr: '' }),
  };
});

import { npx } from '../utils/index.js';
const mockNpx = vi.mocked(npx);

async function createTmpDir(): Promise<string> {
  return mkdtemp(join(tmpdir(), 'skillpm-publish-'));
}

async function setupValidPackage(dir: string): Promise<void> {
  await writeFile(
    join(dir, 'package.json'),
    JSON.stringify({
      name: 'test-skill',
      version: '1.0.0',
      keywords: ['agent-skill'],
    }),
  );
  await mkdir(join(dir, 'skills', 'test-skill'), { recursive: true });
  await writeFile(
    join(dir, 'skills', 'test-skill', 'SKILL.md'),
    '---\nname: test-skill\ndescription: A test skill.\n---\n# Test\n',
  );
}

describe('validatePublish', () => {
  beforeEach(() => {
    mockNpx.mockReset();
    mockNpx.mockResolvedValue({ stdout: '', stderr: '' });
  });

  it('passes for a valid skill package', async () => {
    const dir = await createTmpDir();
    await setupValidPackage(dir);
    const errors = await validatePublish(dir);
    expect(errors).toEqual([]);
    expect(mockNpx).toHaveBeenCalledWith(
      ['skills-ref', 'validate', expect.stringContaining(join('skills', 'test-skill'))],
    );
    await rm(dir, { recursive: true, force: true });
  });

  it('fails when no package.json exists', async () => {
    const dir = await createTmpDir();
    const errors = await validatePublish(dir);
    expect(errors).toContainEqual(expect.stringContaining('No package.json'));
    await rm(dir, { recursive: true, force: true });
  });

  it('fails when agent-skill keyword is missing', async () => {
    const dir = await createTmpDir();
    await writeFile(
      join(dir, 'package.json'),
      JSON.stringify({ name: 'x', version: '1.0.0' }),
    );
    await mkdir(join(dir, 'skills', 'x'), { recursive: true });
    await writeFile(
      join(dir, 'skills', 'x', 'SKILL.md'),
      '---\nname: x\ndescription: Test.\n---\n# X\n',
    );
    const errors = await validatePublish(dir);
    expect(errors).toContainEqual(expect.stringContaining('agent-skill'));
    await rm(dir, { recursive: true, force: true });
  });

  it('fails when no skills/ directory exists', async () => {
    const dir = await createTmpDir();
    await writeFile(
      join(dir, 'package.json'),
      JSON.stringify({ name: 'x', version: '1.0.0', keywords: ['agent-skill'] }),
    );
    const errors = await validatePublish(dir);
    expect(errors).toContainEqual(expect.stringContaining('No skills/ directory'));
    await rm(dir, { recursive: true, force: true });
  });

  it('fails when SKILL.md is missing from skills/ subdirectory', async () => {
    const dir = await createTmpDir();
    await writeFile(
      join(dir, 'package.json'),
      JSON.stringify({ name: 'x', version: '1.0.0', keywords: ['agent-skill'] }),
    );
    await mkdir(join(dir, 'skills', 'x'), { recursive: true });
    const errors = await validatePublish(dir);
    expect(errors).toContainEqual(expect.stringContaining('No SKILL.md'));
    await rm(dir, { recursive: true, force: true });
  });

  it('fails when skills-ref validation fails', async () => {
    const dir = await createTmpDir();
    await setupValidPackage(dir);
    mockNpx.mockRejectedValue(new Error('Missing required field in frontmatter: name'));
    const errors = await validatePublish(dir);
    expect(errors).toContainEqual(
      expect.stringContaining('SKILL.md spec validation failed'),
    );
    await rm(dir, { recursive: true, force: true });
  });
});
