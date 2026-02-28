import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);

// On Windows, npm/npx are .cmd files and require shell resolution
const isWindows = process.platform === 'win32';

export interface ExecResult {
  stdout: string;
  stderr: string;
}

export async function run(
  command: string,
  args: string[],
  opts?: { cwd?: string },
): Promise<ExecResult> {
  const { stdout, stderr } = await execFileAsync(command, args, {
    cwd: opts?.cwd,
    maxBuffer: 10 * 1024 * 1024,
    shell: isWindows,
  });
  return { stdout, stderr };
}

export async function npm(
  args: string[],
  opts?: { cwd?: string },
): Promise<ExecResult> {
  return run('npm', args, opts);
}

export async function npx(
  args: string[],
  opts?: { cwd?: string },
): Promise<ExecResult> {
  return run('npx', ['--yes', ...args], opts);
}
