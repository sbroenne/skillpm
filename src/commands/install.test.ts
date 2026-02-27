import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { mkdtemp, writeFile, mkdir, rm, readFile, symlink } from 'node:fs/promises';
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

async function setupSkillPackage(
  nodeModulesDir: string,
  name: string,
  opts?: { configs: Record<string, string> },
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
  if (opts?.configs) {
    for (const [relPath, content] of Object.entries(opts.configs)) {
      const fullPath = join(pkgDir, 'configs', relPath);
      await mkdir(join(fullPath, '..'), { recursive: true });
      await writeFile(fullPath, content);
    }
  }
}

describe('wireSkills', () => {
  let cwd: string;

  beforeEach(async () => {
    cwd = await createTmpDir();
    mockNpx.mockClear();
  });

  afterEach(async () => {
    await rm(cwd, { recursive: true, force: true });
  });

  it('calls skills add with cwd', async () => {
    await setupSkillPackage(join(cwd, 'node_modules'), 'test-skill');
    await wireSkills(cwd);

    const skillsAddCall = mockNpx.mock.calls.find(
      (call) => call[0][0] === 'skills' && call[0][1] === 'add',
    );
    expect(skillsAddCall).toBeDefined();
    expect(skillsAddCall![1]).toEqual({ cwd });
  });

  it('copies config files with package name prefix', async () => {
    await setupSkillPackage(join(cwd, 'node_modules'), 'my-skill', {
      configs: {
        '.claude/agents/reviewer.md': '# Reviewer agent',
        '.cursor/rules/conventions.md': '# Conventions',
      },
    });
    await wireSkills(cwd);

    const reviewer = await readFile(join(cwd, '.claude/agents/my-skill-reviewer.md'), 'utf-8');
    expect(reviewer).toBe('# Reviewer agent');

    const conventions = await readFile(join(cwd, '.cursor/rules/my-skill-conventions.md'), 'utf-8');
    expect(conventions).toBe('# Conventions');
  });

  it('writes manifest tracking copied files', async () => {
    await setupSkillPackage(join(cwd, 'node_modules'), 'my-skill', {
      configs: { '.claude/agents/reviewer.md': '# Reviewer' },
    });
    await wireSkills(cwd);

    const manifest = JSON.parse(await readFile(join(cwd, '.skillpm/manifest.json'), 'utf-8'));
    expect(manifest['my-skill']).toEqual(['.claude/agents/my-skill-reviewer.md']);
  });

  it('skips configs for skills without configs/ directory', async () => {
    await setupSkillPackage(join(cwd, 'node_modules'), 'plain-skill');
    await wireSkills(cwd);

    // Should not throw; no manifest entry for plain-skill
    let manifest = {};
    try {
      manifest = JSON.parse(await readFile(join(cwd, '.skillpm/manifest.json'), 'utf-8'));
    } catch {
      // No manifest file created — expected
    }
    expect(manifest).not.toHaveProperty('plain-skill');
  });

  it('copies config files from a workspace symlinked package', async () => {
    // Real package lives outside node_modules/ — simulates npm workspace symlink
    const realPkgDir = join(cwd, 'skills', 'workspace-skill');
    const skillDir = join(realPkgDir, 'skills', 'workspace-skill');
    const configsDir = join(realPkgDir, 'configs');
    await mkdir(skillDir, { recursive: true });
    await mkdir(join(configsDir, '.github', 'agents'), { recursive: true });
    await writeFile(
      join(realPkgDir, 'package.json'),
      JSON.stringify({ name: 'workspace-skill', version: '1.0.0' }),
    );
    await writeFile(
      join(skillDir, 'SKILL.md'),
      '---\nname: workspace-skill\ndescription: Test\n---\n',
    );
    await writeFile(join(configsDir, '.github', 'agents', 'agent.md'), '# Workspace Agent');

    // Create symlink in node_modules/ (like npm workspaces does)
    const nodeModulesDir = join(cwd, 'node_modules');
    await mkdir(nodeModulesDir, { recursive: true });
    await symlink(realPkgDir, join(nodeModulesDir, 'workspace-skill'), 'junction');

    await wireSkills(cwd);

    const content = await readFile(join(cwd, '.github', 'agents', 'workspace-skill-agent.md'), 'utf-8');
    expect(content).toBe('# Workspace Agent');

    const manifest = JSON.parse(await readFile(join(cwd, '.skillpm', 'manifest.json'), 'utf-8'));
    expect(manifest['workspace-skill']).toEqual(['.github/agents/workspace-skill-agent.md']);
  });

  it('handles a mix of workspace and regular skill packages', async () => {
    // Regular published skill
    await setupSkillPackage(join(cwd, 'node_modules'), 'published-skill', {
      configs: { '.claude/agents/bot.md': '# Published bot' },
    });

    // Workspace skill via symlink
    const realPkgDir = join(cwd, 'skills', 'local-skill');
    const skillDir = join(realPkgDir, 'skills', 'local-skill');
    const configsDir = join(realPkgDir, 'configs');
    await mkdir(skillDir, { recursive: true });
    await mkdir(join(configsDir, '.claude', 'agents'), { recursive: true });
    await writeFile(
      join(realPkgDir, 'package.json'),
      JSON.stringify({ name: 'local-skill', version: '1.0.0' }),
    );
    await writeFile(join(skillDir, 'SKILL.md'), '---\nname: local-skill\n---\n');
    await writeFile(join(configsDir, '.claude', 'agents', 'local.md'), '# Local bot');
    await symlink(realPkgDir, join(cwd, 'node_modules', 'local-skill'), 'junction');

    await wireSkills(cwd);

    const published = await readFile(join(cwd, '.claude', 'agents', 'published-skill-bot.md'), 'utf-8');
    expect(published).toBe('# Published bot');

    const local = await readFile(join(cwd, '.claude', 'agents', 'local-skill-local.md'), 'utf-8');
    expect(local).toBe('# Local bot');
  });
});
