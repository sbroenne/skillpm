import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);

export const SKILLS_CLI = 'skills@1.7.0';

// On Windows, npm/npx are .cmd files and require shell resolution
const isWindows = process.platform === 'win32';

export interface ExecResult {
  stdout: string;
  stderr: string;
}

export function execErrorMessage(err: unknown): string {
  const message = err instanceof Error ? err.message : String(err);
  // execFile includes stderr in Error.message, but not stdout (e.g. JSON errors).
  const output =
    typeof err === 'object' &&
    err !== null &&
    'stdout' in err &&
    typeof err.stdout === 'string'
      ? err.stdout.trim()
      : '';
  return output ? `${message}\n${output}` : message;
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
