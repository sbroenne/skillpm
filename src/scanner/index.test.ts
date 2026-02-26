import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { scanNodeModules, collectMcpServers } from './index.js';

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
    expect(result[0].mcpServers).toEqual([]);
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

  it('reads skillpm.mcpServers from package.json', async () => {
    const pkgDir = join(tmpDir, 'node_modules', 'mcp-skill');
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
    await writeFile(join(skillDir, 'SKILL.md'), '---\nname: mcp-skill\n---\n');

    const result = await scanNodeModules(tmpDir);
    expect(result).toHaveLength(1);
    expect(result[0].mcpServers).toEqual(['@anthropic/mcp-server-filesystem']);
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

describe('collectMcpServers', () => {
  it('deduplicates MCP servers across skills', () => {
    const skills = [
      { name: 'a', version: '1.0.0', path: '/a', skillDir: '/a/skills/a', mcpServers: ['server-1', 'server-2'], agents: [], prompts: [] },
      { name: 'b', version: '1.0.0', path: '/b', skillDir: '/b/skills/b', mcpServers: ['server-2', 'server-3'], agents: [], prompts: [] },
    ];
    const result = collectMcpServers(skills);
    expect(result).toEqual(['server-1', 'server-2', 'server-3']);
  });
});

describe('agents and prompts scanning', () => {
  let tmpDir: string;

  beforeEach(async () => {
    tmpDir = await mkdtemp(join(tmpdir(), 'skillpm-test-'));
  });

  afterEach(async () => {
    await rm(tmpDir, { recursive: true, force: true });
  });

  it('detects agents/*.md files in skill package', async () => {
    const pkgDir = join(tmpDir, 'node_modules', 'agent-skill');
    const skillDir = join(pkgDir, 'skills', 'agent-skill');
    const agentsDir = join(pkgDir, 'agents');
    await mkdir(skillDir, { recursive: true });
    await mkdir(agentsDir, { recursive: true });
    await writeFile(join(pkgDir, 'package.json'), JSON.stringify({ name: 'agent-skill', version: '1.0.0' }));
    await writeFile(join(skillDir, 'SKILL.md'), '---\nname: agent-skill\n---\n');
    await writeFile(join(agentsDir, 'reviewer.md'), '---\nname: reviewer\n---\n');
    await writeFile(join(agentsDir, 'architect.md'), '---\nname: architect\n---\n');

    const result = await scanNodeModules(tmpDir);
    expect(result).toHaveLength(1);
    expect(result[0].agents).toHaveLength(2);
    expect(result[0].agents.map(a => a.endsWith('.md'))).toEqual([true, true]);
  });

  it('detects prompts/*.md files in skill package', async () => {
    const pkgDir = join(tmpDir, 'node_modules', 'prompt-skill');
    const skillDir = join(pkgDir, 'skills', 'prompt-skill');
    const promptsDir = join(pkgDir, 'prompts');
    await mkdir(skillDir, { recursive: true });
    await mkdir(promptsDir, { recursive: true });
    await writeFile(join(pkgDir, 'package.json'), JSON.stringify({ name: 'prompt-skill', version: '1.0.0' }));
    await writeFile(join(skillDir, 'SKILL.md'), '---\nname: prompt-skill\n---\n');
    await writeFile(join(promptsDir, 'conventions.md'), '---\ndescription: Coding conventions\n---\n');

    const result = await scanNodeModules(tmpDir);
    expect(result).toHaveLength(1);
    expect(result[0].prompts).toHaveLength(1);
  });

  it('returns empty arrays when no agents or prompts dirs exist', async () => {
    const pkgDir = join(tmpDir, 'node_modules', 'plain-skill');
    const skillDir = join(pkgDir, 'skills', 'plain-skill');
    await mkdir(skillDir, { recursive: true });
    await writeFile(join(pkgDir, 'package.json'), JSON.stringify({ name: 'plain-skill', version: '1.0.0' }));
    await writeFile(join(skillDir, 'SKILL.md'), '---\nname: plain-skill\n---\n');

    const result = await scanNodeModules(tmpDir);
    expect(result).toHaveLength(1);
    expect(result[0].agents).toEqual([]);
    expect(result[0].prompts).toEqual([]);
  });

  it('finds multiple skill packages in node_modules', async () => {
    const nm = join(tmpDir, 'node_modules');
    for (const name of ['skill-a', 'skill-b', 'skill-c']) {
      const pkgDir = join(nm, name);
      const skillDir = join(pkgDir, 'skills', name);
      await mkdir(skillDir, { recursive: true });
      await writeFile(join(pkgDir, 'package.json'), JSON.stringify({ name, version: '1.0.0' }));
      await writeFile(join(skillDir, 'SKILL.md'), `---\nname: ${name}\n---\n`);
    }
    // Also add a non-skill package
    const libDir = join(nm, 'some-lib');
    await mkdir(libDir, { recursive: true });
    await writeFile(join(libDir, 'package.json'), JSON.stringify({ name: 'some-lib', version: '2.0.0' }));

    const result = await scanNodeModules(tmpDir);
    expect(result).toHaveLength(3);
    const names = result.map(s => s.name).sort();
    expect(names).toEqual(['skill-a', 'skill-b', 'skill-c']);
  });

  it('ignores non-.md files in agents and prompts dirs', async () => {
    const pkgDir = join(tmpDir, 'node_modules', 'mixed-skill');
    const skillDir = join(pkgDir, 'skills', 'mixed-skill');
    const agentsDir = join(pkgDir, 'agents');
    const promptsDir = join(pkgDir, 'prompts');
    await mkdir(skillDir, { recursive: true });
    await mkdir(agentsDir, { recursive: true });
    await mkdir(promptsDir, { recursive: true });
    await writeFile(join(pkgDir, 'package.json'), JSON.stringify({ name: 'mixed-skill', version: '1.0.0' }));
    await writeFile(join(skillDir, 'SKILL.md'), '---\nname: mixed-skill\n---\n');
    await writeFile(join(agentsDir, 'valid.md'), '---\nname: valid\n---\n');
    await writeFile(join(agentsDir, 'readme.txt'), 'not an agent');
    await writeFile(join(promptsDir, 'rules.md'), '---\ndescription: Rules\n---\n');
    await writeFile(join(promptsDir, 'notes.json'), '{}');

    const result = await scanNodeModules(tmpDir);
    expect(result).toHaveLength(1);
    expect(result[0].agents).toHaveLength(1);
    expect(result[0].prompts).toHaveLength(1);
  });
});
