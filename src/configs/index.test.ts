import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtemp, mkdir, writeFile, readFile, rm, access } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { copyConfigs, removeConfigs } from './index.js';

describe('copyConfigs', () => {
  let cwd: string;
  let configsDir: string;

  beforeEach(async () => {
    cwd = await mkdtemp(join(tmpdir(), 'skillpm-configs-'));
    configsDir = join(cwd, 'source-configs');
  });

  afterEach(async () => {
    await rm(cwd, { recursive: true, force: true });
  });

  it('copies files with package name prefix', async () => {
    await mkdir(join(configsDir, '.claude', 'agents'), { recursive: true });
    await writeFile(join(configsDir, '.claude', 'agents', 'reviewer.md'), '# Reviewer');

    const copied = await copyConfigs(configsDir, cwd, 'my-skill');

    expect(copied).toEqual(['.claude/agents/my-skill--reviewer.md']);
    const content = await readFile(join(cwd, '.claude', 'agents', 'my-skill--reviewer.md'), 'utf-8');
    expect(content).toBe('# Reviewer');
  });

  it('handles multiple target directories', async () => {
    await mkdir(join(configsDir, '.claude', 'agents'), { recursive: true });
    await mkdir(join(configsDir, '.cursor', 'rules'), { recursive: true });
    await mkdir(join(configsDir, '.github', 'instructions'), { recursive: true });
    await writeFile(join(configsDir, '.claude', 'agents', 'bot.md'), 'claude agent');
    await writeFile(join(configsDir, '.cursor', 'rules', 'style.md'), 'cursor rule');
    await writeFile(join(configsDir, '.github', 'instructions', 'help.instructions.md'), 'copilot');

    const copied = await copyConfigs(configsDir, cwd, 'pkg');

    expect(copied).toHaveLength(3);
    expect(copied).toContain('.claude/agents/pkg--bot.md');
    expect(copied).toContain('.cursor/rules/pkg--style.md');
    expect(copied).toContain('.github/instructions/pkg--help.instructions.md');
  });

  it('writes manifest with copied files', async () => {
    await mkdir(join(configsDir, '.claude', 'agents'), { recursive: true });
    await writeFile(join(configsDir, '.claude', 'agents', 'a.md'), 'agent');

    await copyConfigs(configsDir, cwd, 'test-pkg');

    const manifest = JSON.parse(await readFile(join(cwd, '.skillpm', 'manifest.json'), 'utf-8'));
    expect(manifest['test-pkg']).toEqual(['.claude/agents/test-pkg--a.md']);
  });

  it('updates manifest for multiple packages', async () => {
    const configs1 = join(cwd, 'configs1');
    const configs2 = join(cwd, 'configs2');
    await mkdir(join(configs1, '.claude', 'agents'), { recursive: true });
    await mkdir(join(configs2, '.cursor', 'rules'), { recursive: true });
    await writeFile(join(configs1, '.claude', 'agents', 'a.md'), 'a');
    await writeFile(join(configs2, '.cursor', 'rules', 'b.md'), 'b');

    await copyConfigs(configs1, cwd, 'pkg-a');
    await copyConfigs(configs2, cwd, 'pkg-b');

    const manifest = JSON.parse(await readFile(join(cwd, '.skillpm', 'manifest.json'), 'utf-8'));
    expect(manifest['pkg-a']).toEqual(['.claude/agents/pkg-a--a.md']);
    expect(manifest['pkg-b']).toEqual(['.cursor/rules/pkg-b--b.md']);
  });

  it('returns empty array for empty configs dir', async () => {
    await mkdir(configsDir, { recursive: true });
    const copied = await copyConfigs(configsDir, cwd, 'empty-pkg');
    expect(copied).toEqual([]);
  });

  it('handles scoped package names in prefix', async () => {
    await mkdir(join(configsDir, '.claude', 'agents'), { recursive: true });
    await writeFile(join(configsDir, '.claude', 'agents', 'bot.md'), 'agent');

    const copied = await copyConfigs(configsDir, cwd, '@org/my-skill');

    expect(copied).toEqual(['.claude/agents/@org/my-skill--bot.md']);
    const content = await readFile(join(cwd, '.claude', 'agents', '@org/my-skill--bot.md'), 'utf-8');
    expect(content).toBe('agent');
  });
});

describe('removeConfigs', () => {
  let cwd: string;

  beforeEach(async () => {
    cwd = await mkdtemp(join(tmpdir(), 'skillpm-configs-'));
  });

  afterEach(async () => {
    await rm(cwd, { recursive: true, force: true });
  });

  it('removes files listed in manifest', async () => {
    // Set up wired files + manifest
    await mkdir(join(cwd, '.claude', 'agents'), { recursive: true });
    await writeFile(join(cwd, '.claude', 'agents', 'my-skill--reviewer.md'), '# Reviewer');
    await mkdir(join(cwd, '.skillpm'), { recursive: true });
    await writeFile(
      join(cwd, '.skillpm', 'manifest.json'),
      JSON.stringify({ 'my-skill': ['.claude/agents/my-skill--reviewer.md'] }),
    );

    const removed = await removeConfigs(cwd, 'my-skill');

    expect(removed).toEqual(['.claude/agents/my-skill--reviewer.md']);
    await expect(access(join(cwd, '.claude', 'agents', 'my-skill--reviewer.md'))).rejects.toThrow();
  });

  it('removes package entry from manifest', async () => {
    await mkdir(join(cwd, '.skillpm'), { recursive: true });
    await writeFile(
      join(cwd, '.skillpm', 'manifest.json'),
      JSON.stringify({
        'pkg-a': ['.claude/agents/pkg-a--a.md'],
        'pkg-b': ['.cursor/rules/pkg-b--b.md'],
      }),
    );
    // Create files
    await mkdir(join(cwd, '.claude', 'agents'), { recursive: true });
    await writeFile(join(cwd, '.claude', 'agents', 'pkg-a--a.md'), 'a');

    await removeConfigs(cwd, 'pkg-a');

    const manifest = JSON.parse(await readFile(join(cwd, '.skillpm', 'manifest.json'), 'utf-8'));
    expect(manifest).not.toHaveProperty('pkg-a');
    expect(manifest).toHaveProperty('pkg-b');
  });

  it('returns empty array when package not in manifest', async () => {
    const removed = await removeConfigs(cwd, 'nonexistent');
    expect(removed).toEqual([]);
  });

  it('handles already-deleted files gracefully', async () => {
    await mkdir(join(cwd, '.skillpm'), { recursive: true });
    await writeFile(
      join(cwd, '.skillpm', 'manifest.json'),
      JSON.stringify({ 'ghost': ['.claude/agents/ghost--a.md'] }),
    );

    // File doesn't exist — should not throw
    const removed = await removeConfigs(cwd, 'ghost');
    expect(removed).toEqual([]);
  });
});

describe('copyConfigs + removeConfigs roundtrip', () => {
  let cwd: string;

  beforeEach(async () => {
    cwd = await mkdtemp(join(tmpdir(), 'skillpm-configs-'));
  });

  afterEach(async () => {
    await rm(cwd, { recursive: true, force: true });
  });

  it('install then uninstall leaves no files behind', async () => {
    const configsDir = join(cwd, 'source');
    await mkdir(join(configsDir, '.claude', 'agents'), { recursive: true });
    await mkdir(join(configsDir, '.cursor', 'rules'), { recursive: true });
    await writeFile(join(configsDir, '.claude', 'agents', 'bot.md'), 'agent');
    await writeFile(join(configsDir, '.cursor', 'rules', 'style.md'), 'rule');

    await copyConfigs(configsDir, cwd, 'my-skill');
    // Verify files exist
    await expect(readFile(join(cwd, '.claude', 'agents', 'my-skill--bot.md'), 'utf-8')).resolves.toBe('agent');

    const removed = await removeConfigs(cwd, 'my-skill');
    expect(removed).toHaveLength(2);

    // Verify files are gone
    await expect(access(join(cwd, '.claude', 'agents', 'my-skill--bot.md'))).rejects.toThrow();
    await expect(access(join(cwd, '.cursor', 'rules', 'my-skill--style.md'))).rejects.toThrow();

    // Manifest should have empty entry for my-skill
    const manifest = JSON.parse(await readFile(join(cwd, '.skillpm', 'manifest.json'), 'utf-8'));
    expect(manifest).not.toHaveProperty('my-skill');
  });
});
