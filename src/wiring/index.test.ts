import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtemp, mkdir, writeFile, readFile, rm, access } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { copyWiring, removeWiring } from './index.js';

describe('copyWiring', () => {
  let cwd: string;
  let wiringDir: string;

  beforeEach(async () => {
    cwd = await mkdtemp(join(tmpdir(), 'skillpm-wiring-'));
    wiringDir = join(cwd, 'source-wiring');
  });

  afterEach(async () => {
    await rm(cwd, { recursive: true, force: true });
  });

  it('copies files with package name prefix', async () => {
    await mkdir(join(wiringDir, '.claude', 'agents'), { recursive: true });
    await writeFile(join(wiringDir, '.claude', 'agents', 'reviewer.md'), '# Reviewer');

    const copied = await copyWiring(wiringDir, cwd, 'my-skill');

    expect(copied).toEqual(['.claude/agents/my-skill--reviewer.md']);
    const content = await readFile(join(cwd, '.claude', 'agents', 'my-skill--reviewer.md'), 'utf-8');
    expect(content).toBe('# Reviewer');
  });

  it('handles multiple target directories', async () => {
    await mkdir(join(wiringDir, '.claude', 'agents'), { recursive: true });
    await mkdir(join(wiringDir, '.cursor', 'rules'), { recursive: true });
    await mkdir(join(wiringDir, '.github', 'instructions'), { recursive: true });
    await writeFile(join(wiringDir, '.claude', 'agents', 'bot.md'), 'claude agent');
    await writeFile(join(wiringDir, '.cursor', 'rules', 'style.md'), 'cursor rule');
    await writeFile(join(wiringDir, '.github', 'instructions', 'help.instructions.md'), 'copilot');

    const copied = await copyWiring(wiringDir, cwd, 'pkg');

    expect(copied).toHaveLength(3);
    expect(copied).toContain('.claude/agents/pkg--bot.md');
    expect(copied).toContain('.cursor/rules/pkg--style.md');
    expect(copied).toContain('.github/instructions/pkg--help.instructions.md');
  });

  it('writes manifest with copied files', async () => {
    await mkdir(join(wiringDir, '.claude', 'agents'), { recursive: true });
    await writeFile(join(wiringDir, '.claude', 'agents', 'a.md'), 'agent');

    await copyWiring(wiringDir, cwd, 'test-pkg');

    const manifest = JSON.parse(await readFile(join(cwd, '.skillpm', 'manifest.json'), 'utf-8'));
    expect(manifest['test-pkg']).toEqual(['.claude/agents/test-pkg--a.md']);
  });

  it('updates manifest for multiple packages', async () => {
    const wiring1 = join(cwd, 'wiring1');
    const wiring2 = join(cwd, 'wiring2');
    await mkdir(join(wiring1, '.claude', 'agents'), { recursive: true });
    await mkdir(join(wiring2, '.cursor', 'rules'), { recursive: true });
    await writeFile(join(wiring1, '.claude', 'agents', 'a.md'), 'a');
    await writeFile(join(wiring2, '.cursor', 'rules', 'b.md'), 'b');

    await copyWiring(wiring1, cwd, 'pkg-a');
    await copyWiring(wiring2, cwd, 'pkg-b');

    const manifest = JSON.parse(await readFile(join(cwd, '.skillpm', 'manifest.json'), 'utf-8'));
    expect(manifest['pkg-a']).toEqual(['.claude/agents/pkg-a--a.md']);
    expect(manifest['pkg-b']).toEqual(['.cursor/rules/pkg-b--b.md']);
  });

  it('returns empty array for empty wiring dir', async () => {
    await mkdir(wiringDir, { recursive: true });
    const copied = await copyWiring(wiringDir, cwd, 'empty-pkg');
    expect(copied).toEqual([]);
  });

  it('handles scoped package names in prefix', async () => {
    await mkdir(join(wiringDir, '.claude', 'agents'), { recursive: true });
    await writeFile(join(wiringDir, '.claude', 'agents', 'bot.md'), 'agent');

    const copied = await copyWiring(wiringDir, cwd, '@org/my-skill');

    expect(copied).toEqual(['.claude/agents/@org/my-skill--bot.md']);
    const content = await readFile(join(cwd, '.claude', 'agents', '@org/my-skill--bot.md'), 'utf-8');
    expect(content).toBe('agent');
  });
});

describe('removeWiring', () => {
  let cwd: string;

  beforeEach(async () => {
    cwd = await mkdtemp(join(tmpdir(), 'skillpm-wiring-'));
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

    const removed = await removeWiring(cwd, 'my-skill');

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

    await removeWiring(cwd, 'pkg-a');

    const manifest = JSON.parse(await readFile(join(cwd, '.skillpm', 'manifest.json'), 'utf-8'));
    expect(manifest).not.toHaveProperty('pkg-a');
    expect(manifest).toHaveProperty('pkg-b');
  });

  it('returns empty array when package not in manifest', async () => {
    const removed = await removeWiring(cwd, 'nonexistent');
    expect(removed).toEqual([]);
  });

  it('handles already-deleted files gracefully', async () => {
    await mkdir(join(cwd, '.skillpm'), { recursive: true });
    await writeFile(
      join(cwd, '.skillpm', 'manifest.json'),
      JSON.stringify({ 'ghost': ['.claude/agents/ghost--a.md'] }),
    );

    // File doesn't exist — should not throw
    const removed = await removeWiring(cwd, 'ghost');
    expect(removed).toEqual([]);
  });
});

describe('copyWiring + removeWiring roundtrip', () => {
  let cwd: string;

  beforeEach(async () => {
    cwd = await mkdtemp(join(tmpdir(), 'skillpm-wiring-'));
  });

  afterEach(async () => {
    await rm(cwd, { recursive: true, force: true });
  });

  it('install then uninstall leaves no files behind', async () => {
    const wiringDir = join(cwd, 'source');
    await mkdir(join(wiringDir, '.claude', 'agents'), { recursive: true });
    await mkdir(join(wiringDir, '.cursor', 'rules'), { recursive: true });
    await writeFile(join(wiringDir, '.claude', 'agents', 'bot.md'), 'agent');
    await writeFile(join(wiringDir, '.cursor', 'rules', 'style.md'), 'rule');

    await copyWiring(wiringDir, cwd, 'my-skill');
    // Verify files exist
    await expect(readFile(join(cwd, '.claude', 'agents', 'my-skill--bot.md'), 'utf-8')).resolves.toBe('agent');

    const removed = await removeWiring(cwd, 'my-skill');
    expect(removed).toHaveLength(2);

    // Verify files are gone
    await expect(access(join(cwd, '.claude', 'agents', 'my-skill--bot.md'))).rejects.toThrow();
    await expect(access(join(cwd, '.cursor', 'rules', 'my-skill--style.md'))).rejects.toThrow();

    // Manifest should have empty entry for my-skill
    const manifest = JSON.parse(await readFile(join(cwd, '.skillpm', 'manifest.json'), 'utf-8'));
    expect(manifest).not.toHaveProperty('my-skill');
  });
});
