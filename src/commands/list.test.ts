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

import { list } from './list.js';

async function createTmpDir(): Promise<string> {
  return mkdtemp(join(tmpdir(), 'skillpm-list-'));
}

async function setupSkillPackage(
  nodeModulesDir: string,
  name: string,
  opts?: { description?: string; mcpServers?: string[] },
): Promise<void> {
  const pkgDir = join(nodeModulesDir, name);
  const skillDir = join(pkgDir, 'skills', name);
  await mkdir(skillDir, { recursive: true });
  const pkg: Record<string, unknown> = { name, version: '1.0.0' };
  if (opts?.mcpServers) {
    pkg.skillpm = { mcpServers: opts.mcpServers };
  }
  await writeFile(join(pkgDir, 'package.json'), JSON.stringify(pkg));
  const desc = opts?.description ?? 'A test skill';
  await writeFile(
    join(skillDir, 'SKILL.md'),
    `---\nname: ${name}\ndescription: ${desc}\n---\n# ${name}\n`,
  );
}

describe('list --json', () => {
  let cwd: string;

  beforeEach(async () => {
    cwd = await createTmpDir();
  });

  afterEach(async () => {
    await rm(cwd, { recursive: true, force: true });
  });

  it('outputs valid JSON array', async () => {
    await setupSkillPackage(join(cwd, 'node_modules'), 'my-skill');

    const output: string[] = [];
    const origLog = console.log;
    console.log = (...args: unknown[]) => output.push(args.join(' '));
    try {
      await list(['--json'], cwd);
    } finally {
      console.log = origLog;
    }

    const parsed = JSON.parse(output.join('\n'));
    expect(Array.isArray(parsed)).toBe(true);
    expect(parsed).toHaveLength(1);
    expect(parsed[0]).toEqual({
      name: 'my-skill',
      version: '1.0.0',
      description: 'A test skill',
    });
  });

  it('outputs empty array when no skills installed', async () => {
    const output: string[] = [];
    const origLog = console.log;
    console.log = (...args: unknown[]) => output.push(args.join(' '));
    try {
      await list(['--json'], cwd);
    } finally {
      console.log = origLog;
    }

    const parsed = JSON.parse(output.join('\n'));
    expect(parsed).toEqual([]);
  });

  it('includes mcpServers when present', async () => {
    await setupSkillPackage(join(cwd, 'node_modules'), 'mcp-skill', {
      description: 'Has MCP',
      mcpServers: ['@anthropic/mcp-server-filesystem'],
    });

    const output: string[] = [];
    const origLog = console.log;
    console.log = (...args: unknown[]) => output.push(args.join(' '));
    try {
      await list(['--json'], cwd);
    } finally {
      console.log = origLog;
    }

    const parsed = JSON.parse(output.join('\n'));
    expect(parsed[0].mcpServers).toEqual(['@anthropic/mcp-server-filesystem']);
  });
});
