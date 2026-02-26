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
  let cwd: string;

  beforeEach(async () => {
    cwd = await createTmpDir();
    mockNpx.mockReset();
    mockNpx.mockResolvedValue({ stdout: '', stderr: '' });
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

  it('wires agents and prompts via add-custom-agent and add-custom-prompt', async () => {
    const nodeModules = join(cwd, 'node_modules');
    const pkgDir = join(nodeModules, 'full-skill');
    const skillDir = join(pkgDir, 'skills', 'full-skill');
    const agentsDir = join(pkgDir, 'agents');
    const promptsDir = join(pkgDir, 'prompts');
    await mkdir(skillDir, { recursive: true });
    await mkdir(agentsDir, { recursive: true });
    await mkdir(promptsDir, { recursive: true });
    await writeFile(
      join(pkgDir, 'package.json'),
      JSON.stringify({ name: 'full-skill', version: '1.0.0' }),
    );
    await writeFile(
      join(skillDir, 'SKILL.md'),
      '---\nname: full-skill\ndescription: Test\n---\n# full-skill\n',
    );
    await writeFile(join(agentsDir, 'reviewer.md'), '---\nname: reviewer\n---\n');
    await writeFile(join(promptsDir, 'conventions.md'), '---\ndescription: Conventions\n---\n');

    await wireSkills(cwd);

    const agentCall = mockNpx.mock.calls.find(
      (call) => call[0][0] === 'add-custom-agent',
    );
    expect(agentCall).toBeDefined();
    expect(agentCall![0]).toEqual([
      'add-custom-agent',
      join(agentsDir, 'reviewer.md'),
      '--package',
      'full-skill',
    ]);
    expect(agentCall![1]).toEqual({ cwd });

    const promptCall = mockNpx.mock.calls.find(
      (call) => call[0][0] === 'add-custom-prompt',
    );
    expect(promptCall).toBeDefined();
    expect(promptCall![0]).toEqual([
      'add-custom-prompt',
      join(promptsDir, 'conventions.md'),
      '--package',
      'full-skill',
    ]);
    expect(promptCall![1]).toEqual({ cwd });
  });

  it('configures MCP servers from skillpm.mcpServers', async () => {
    const nodeModules = join(cwd, 'node_modules');
    const pkgDir = join(nodeModules, 'mcp-skill');
    const skillDir = join(pkgDir, 'skills', 'mcp-skill');
    await mkdir(skillDir, { recursive: true });
    await writeFile(
      join(pkgDir, 'package.json'),
      JSON.stringify({
        name: 'mcp-skill',
        version: '1.0.0',
        skillpm: { mcpServers: ['@anthropic/mcp-server-filesystem'] },
      }),
    );
    await writeFile(
      join(skillDir, 'SKILL.md'),
      '---\nname: mcp-skill\ndescription: Test\n---\n# mcp-skill\n',
    );

    await wireSkills(cwd);

    const mcpCall = mockNpx.mock.calls.find(
      (call) => call[0][0] === 'add-mcp',
    );
    expect(mcpCall).toBeDefined();
    expect(mcpCall![0]).toEqual(['add-mcp', '@anthropic/mcp-server-filesystem', '-y']);
    expect(mcpCall![1]).toEqual({ cwd });
  });

  it('continues wiring agents/prompts even if skills add fails', async () => {
    const nodeModules = join(cwd, 'node_modules');
    const pkgDir = join(nodeModules, 'err-skill');
    const skillDir = join(pkgDir, 'skills', 'err-skill');
    const agentsDir = join(pkgDir, 'agents');
    await mkdir(skillDir, { recursive: true });
    await mkdir(agentsDir, { recursive: true });
    await writeFile(
      join(pkgDir, 'package.json'),
      JSON.stringify({ name: 'err-skill', version: '1.0.0' }),
    );
    await writeFile(
      join(skillDir, 'SKILL.md'),
      '---\nname: err-skill\ndescription: Test\n---\n# err-skill\n',
    );
    await writeFile(join(agentsDir, 'helper.md'), '---\nname: helper\n---\n');

    mockNpx.mockImplementation(async (args: string[]) => {
      if (args[0] === 'skills' && args[1] === 'add') {
        throw new Error('skills add failed');
      }
      return { stdout: '', stderr: '' };
    });

    await expect(wireSkills(cwd)).resolves.toBeUndefined();

    const agentCall = mockNpx.mock.calls.find(
      (call) => call[0][0] === 'add-custom-agent',
    );
    expect(agentCall).toBeDefined();
    expect(agentCall![0][1]).toBe(join(agentsDir, 'helper.md'));
  });

  it('makes no npx calls when node_modules is empty', async () => {
    await mkdir(join(cwd, 'node_modules'), { recursive: true });
    await wireSkills(cwd);
    expect(mockNpx).not.toHaveBeenCalled();
  });

  it('finds and wires a legacy skill with SKILL.md at root', async () => {
    const nodeModules = join(cwd, 'node_modules');
    const pkgDir = join(nodeModules, 'legacy-skill');
    await mkdir(pkgDir, { recursive: true });
    await writeFile(
      join(pkgDir, 'package.json'),
      JSON.stringify({ name: 'legacy-skill', version: '0.1.0' }),
    );
    await writeFile(
      join(pkgDir, 'SKILL.md'),
      '---\nname: legacy-skill\ndescription: Legacy\n---\n# legacy-skill\n',
    );

    await wireSkills(cwd);

    const skillsAddCall = mockNpx.mock.calls.find(
      (call) => call[0][0] === 'skills' && call[0][1] === 'add',
    );
    expect(skillsAddCall).toBeDefined();
    expect(skillsAddCall![0][2]).toBe(pkgDir);
    expect(skillsAddCall![1]).toEqual({ cwd });
  });
});
