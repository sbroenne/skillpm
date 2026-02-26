import { npm, log } from '../utils/index.js';
import { wireSkills } from './install.js';
import { removeWiring } from '../wiring/index.js';

export async function uninstall(args: string[], cwd: string): Promise<void> {
  if (args.length === 0) {
    log.error('Usage: skillpm uninstall <skill> [skill...]');
    process.exit(1);
  }

  // Clean up wired files before npm uninstall
  for (const pkg of args) {
    try {
      const removed = await removeWiring(cwd, pkg);
      if (removed.length > 0) {
        log.info(`Removed ${removed.length} wired file(s) from ${pkg}`);
      }
    } catch {
      // Ignore — package may not have had wiring
    }
  }

  log.info(`Running npm uninstall ${args.join(' ')}`);
  try {
    const result = await npm(['uninstall', ...args], { cwd });
    if (result.stderr) process.stderr.write(result.stderr);
    if (result.stdout) process.stdout.write(result.stdout);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    log.error(`npm uninstall failed: ${msg}`);
    process.exit(1);
  }

  // Re-wire to clean up stale symlinks
  await wireSkills(cwd);
}
