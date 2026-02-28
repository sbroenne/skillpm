import { describe, it, expect } from 'vitest';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { resolve } from 'node:path';
import { createRequire } from 'node:module';

const exec = promisify(execFile);
const cli = resolve(process.cwd(), 'dist', 'cli.js');
const require = createRequire(import.meta.url);
const { version: PACKAGE_VERSION } = require('../package.json') as { version: string };

describe('CLI', () => {
  it('shows help with --help', async () => {
    const { stdout } = await exec('node', [cli, '--help']);
    expect(stdout).toContain('skillpm');
    expect(stdout).toContain('install');
    expect(stdout).toContain('publish');
  });

  it('shows version with --version', async () => {
    const { stdout } = await exec('node', [cli, '--version']);
    expect(stdout.trim()).toBe(PACKAGE_VERSION);
  });

  it('shows help with no args', async () => {
    const { stdout } = await exec('node', [cli]);
    expect(stdout).toContain('skillpm');
  });

  it('exits with error for unknown command', async () => {
    await expect(exec('node', [cli, 'bogus'])).rejects.toThrow();
  });
});
