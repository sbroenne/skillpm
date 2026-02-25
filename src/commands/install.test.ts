import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { mkdtemp, writeFile, mkdir, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

vi.mock('../utils/index.js', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../utils/index.js')>();
  return {
    ...actual,
    npm: vi.fn().mockResolvedValue({ stdout: '', stderr: '' }),
    npx: vi.fn().mockResolvedValue({ stdout: '', stderr: '' }),
  };
});

import { npx } from '../utils/index.js';
import { wireSkills } from './install.js';

const mockNpx = vi.mocked(npx);

async function createTmpDir(): Promise<string> {
  return mkdtemp(join(tmpdir(), 'skillpm-install-'));
}

async function setupSkillPackage(nodeModulesDir: string, name: string): Promise<void> {
  const pkgDir = join(nodeModulesDir, name);
  const skillDir = join(pkgDir, 'skills', name);
  await mkdir(skillDir, { recursive: true });
  await writeFile(
    join(pkgDir, 'package.json'),
    JSON.stringify({ name, version: '1.0.0' }),
  );
  await writeFile(
    join(skillDir, 'SKILL.md'),
    `---\nname: ${name}\ndescription: Test\n---\n# ${name}\n`,
  );
}

describe('wireSkills', () => {
  let scanRoot: string;
  let wireTarget: string;

  beforeEach(async () => {
    scanRoot = await createTmpDir();
    wireTarget = await createTmpDir();
    mockNpx.mockClear();
  });

  afterEach(async () => {
    await rm(scanRoot, { recursive: true, force: true });
    await rm(wireTarget, { recursive: true, force: true });
  });

  it('uses wireTarget directory for skills add, not scanRoot', async () => {
    await setupSkillPackage(join(scanRoot, 'node_modules'), 'test-skill');
    await wireSkills(scanRoot, wireTarget);

    // skills add should be called with wireTarget as cwd
    const skillsAddCall = mockNpx.mock.calls.find(
      (call) => call[0][0] === 'skills' && call[0][1] === 'add',
    );
    expect(skillsAddCall).toBeDefined();
    expect(skillsAddCall![1]).toEqual({ cwd: wireTarget });
  });

  it('defaults wireTarget to scanRoot when not provided', async () => {
    await setupSkillPackage(join(scanRoot, 'node_modules'), 'test-skill');
    await wireSkills(scanRoot);

    const skillsAddCall = mockNpx.mock.calls.find(
      (call) => call[0][0] === 'skills' && call[0][1] === 'add',
    );
    expect(skillsAddCall).toBeDefined();
    expect(skillsAddCall![1]).toEqual({ cwd: scanRoot });
  });
});
