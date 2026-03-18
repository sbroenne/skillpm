import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtemp, writeFile, mkdir, rm, symlink } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { list } from './list.js';

async function createTmpDir(): Promise<string> {
  return mkdtemp(join(tmpdir(), 'skillpm-list-'));
}

async function setupSkillPackage(
  nodeModulesDir: string,
  name: string,
  opts?: { description?: string; legacy?: boolean },
): Promise<void> {
  const pkgDir = join(nodeModulesDir, name);
  const skillDir = opts?.legacy ? pkgDir : join(pkgDir, 'skills', name);
  await mkdir(skillDir, { recursive: true });
  await writeFile(join(pkgDir, 'package.json'), JSON.stringify({ name, version: '1.0.0' }));
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

  it('includes legacy and workspace flags when present', async () => {
    await setupSkillPackage(join(cwd, 'node_modules'), 'legacy-skill', {
      description: 'Legacy skill',
      legacy: true,
    });

    const workspaceRealDir = join(cwd, 'workspace-src', 'workspace-skill');
    const workspaceSkillDir = join(workspaceRealDir, 'skills', 'workspace-skill');
    await mkdir(workspaceSkillDir, { recursive: true });
    await writeFile(
      join(workspaceRealDir, 'package.json'),
      JSON.stringify({ name: 'workspace-skill', version: '1.0.0' }),
    );
    await writeFile(
      join(workspaceSkillDir, 'SKILL.md'),
      '---\nname: workspace-skill\ndescription: Workspace skill\n---\n# workspace-skill\n',
    );
    await symlink(workspaceRealDir, join(cwd, 'node_modules', 'workspace-skill'), 'junction');

    const output: string[] = [];
    const origLog = console.log;
    console.log = (...args: unknown[]) => output.push(args.join(' '));
    try {
      await list(['--json'], cwd);
    } finally {
      console.log = origLog;
    }

    const parsed = JSON.parse(output.join('\n'));
    const legacy = parsed.find((item: { name: string }) => item.name === 'legacy-skill');
    const workspace = parsed.find((item: { name: string }) => item.name === 'workspace-skill');

    expect(legacy).toMatchObject({
      name: 'legacy-skill',
      version: '1.0.0',
      description: 'Legacy skill',
      legacy: true,
    });
    expect(workspace).toMatchObject({
      name: 'workspace-skill',
      version: '1.0.0',
      description: 'Workspace skill',
      workspace: true,
    });
  });
});
