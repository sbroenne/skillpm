import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { mkdtemp, writeFile, mkdir, rm, symlink } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

vi.mock('../utils/index.js', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../utils/index.js')>();
  return {
    ...actual,
    npm: vi.fn().mockResolvedValue({ stdout: '', stderr: '' }),
    npx: vi.fn().mockResolvedValue({ stdout: '', stderr: '' }),
    log: {
      ...actual.log,
      warn: vi.fn(),
    },
  };
});

import { npx, log } from '../utils/index.js';
import { wireSkills } from './install.js';

const mockNpx = vi.mocked(npx);
const mockWarn = vi.mocked(log.warn);

async function createTmpDir(): Promise<string> {
  return mkdtemp(join(tmpdir(), 'skillpm-install-'));
}

async function setupSkillPackage(
  nodeModulesDir: string,
  name: string,
): Promise<void> {
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
  let cwd: string;

  beforeEach(async () => {
    cwd = await createTmpDir();
    mockNpx.mockClear();
    mockWarn.mockClear();
  });

  afterEach(async () => {
    await rm(cwd, { recursive: true, force: true });
  });

  it('calls skills add with -y and cwd (no --all)', async () => {
    await setupSkillPackage(join(cwd, 'node_modules'), 'test-skill');
    await wireSkills(cwd);

    const skillsAddCall = mockNpx.mock.calls.find(
      (call) => call[0][0] === 'skills' && call[0][1] === 'add',
    );
    expect(skillsAddCall).toBeDefined();
    expect(skillsAddCall![0]).not.toContain('--all');
    expect(skillsAddCall![0]).toContain('-y');
    expect(skillsAddCall![1]).toEqual({ cwd });
  });

  it('links every discovered skill package', async () => {
    await setupSkillPackage(join(cwd, 'node_modules'), 'first-skill');
    await setupSkillPackage(join(cwd, 'node_modules'), 'second-skill');
    await wireSkills(cwd);

    const skillsAddCalls = mockNpx.mock.calls.filter(
      (call) => call[0][0] === 'skills' && call[0][1] === 'add',
    );
    expect(skillsAddCalls).toHaveLength(2);
    expect(skillsAddCalls.map((call) => call[0][2]).sort()).toEqual([
      join(cwd, 'node_modules', 'first-skill', 'skills', 'first-skill'),
      join(cwd, 'node_modules', 'second-skill', 'skills', 'second-skill'),
    ]);
  });

  it('does nothing when no skill packages are installed', async () => {
    await mkdir(join(cwd, 'node_modules'), { recursive: true });
    await wireSkills(cwd);

    const skillsAddCalls = mockNpx.mock.calls.filter(
      (call) => call[0][0] === 'skills' && call[0][1] === 'add',
    );
    expect(skillsAddCalls).toHaveLength(0);
  });

  it('links a workspace symlinked package', async () => {
    const realPkgDir = join(cwd, 'skills', 'workspace-skill');
    const skillDir = join(realPkgDir, 'skills', 'workspace-skill');
    await mkdir(skillDir, { recursive: true });
    await writeFile(
      join(realPkgDir, 'package.json'),
      JSON.stringify({ name: 'workspace-skill', version: '1.0.0' }),
    );
    await writeFile(
      join(skillDir, 'SKILL.md'),
      '---\nname: workspace-skill\ndescription: Test\n---\n',
    );

    const nodeModulesDir = join(cwd, 'node_modules');
    await mkdir(nodeModulesDir, { recursive: true });
    await symlink(realPkgDir, join(nodeModulesDir, 'workspace-skill'), 'junction');

    await wireSkills(cwd);

    const skillsAddCalls = mockNpx.mock.calls.filter(
      (call) => call[0][0] === 'skills' && call[0][1] === 'add',
    );
    expect(skillsAddCalls).toHaveLength(1);
    expect(skillsAddCalls[0][0]).toEqual([
      'skills',
      'add',
      join(cwd, 'node_modules', 'workspace-skill', 'skills', 'workspace-skill'),
      '-y',
    ]);
    expect(skillsAddCalls[0][1]).toEqual({ cwd });
  });

  it('warns for legacy root SKILL.md packages', async () => {
    const legacyDir = join(cwd, 'node_modules', 'legacy-skill');
    await mkdir(legacyDir, { recursive: true });
    await writeFile(
      join(legacyDir, 'package.json'),
      JSON.stringify({ name: 'legacy-skill', version: '1.0.0' }),
    );
    await writeFile(join(legacyDir, 'SKILL.md'), '---\nname: legacy-skill\n---\n');

    await wireSkills(cwd);

    expect(
      mockNpx.mock.calls.some(
        (call) => call[0][0] === 'skills' && call[0][2] === legacyDir,
      ),
    ).toBe(true);
    expect(mockWarn).toHaveBeenCalledWith(
      expect.stringContaining('legacy-skill: SKILL.md is at package root.'),
    );
  });
});
