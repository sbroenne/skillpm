import { readdir, copyFile, mkdir, unlink, readFile, writeFile, stat } from 'node:fs/promises';
import { join, relative, dirname, basename } from 'node:path';

const MANIFEST_DIR = '.skillpm';
const MANIFEST_FILE = 'manifest.json';

interface ConfigsManifest {
  [packageName: string]: string[];
}

async function readManifest(cwd: string): Promise<ConfigsManifest> {
  try {
    const raw = await readFile(join(cwd, MANIFEST_DIR, MANIFEST_FILE), 'utf-8');
    return JSON.parse(raw) as ConfigsManifest;
  } catch {
    return {};
  }
}

async function writeManifest(cwd: string, manifest: ConfigsManifest): Promise<void> {
  const dir = join(cwd, MANIFEST_DIR);
  await mkdir(dir, { recursive: true });
  await writeFile(join(dir, MANIFEST_FILE), JSON.stringify(manifest, null, 2) + '\n');
}

/**
 * Recursively collect all files in a directory, returning paths relative to the root.
 */
async function walkDir(dir: string, root?: string): Promise<string[]> {
  root ??= dir;
  const files: string[] = [];
  let entries: string[];
  try {
    entries = await readdir(dir);
  } catch {
    return files;
  }
  for (const name of entries) {
    const full = join(dir, name);
    const s = await stat(full);
    if (s.isDirectory()) {
      files.push(...(await walkDir(full, root)));
    } else {
      files.push(relative(root, full));
    }
  }
  return files;
}

/**
 * Auto-prefix a filename with the package name to avoid conflicts.
 * e.g. "reviewer.md" with package "my-skill" → "my-skill--reviewer.md"
 */
function prefixFilename(relPath: string, packageName: string): string {
  const dir = dirname(relPath);
  const file = basename(relPath);
  const prefixed = `${packageName}--${file}`;
  return dir === '.' ? prefixed : join(dir, prefixed);
}

/**
 * Copy all files from a skill's configs/ directory to the workspace,
 * auto-prefixing filenames with the package name.
 */
export async function copyConfigs(
  configsDir: string,
  cwd: string,
  packageName: string,
): Promise<string[]> {
  const files = await walkDir(configsDir);
  const copied: string[] = [];

  for (const relPath of files) {
    const prefixed = prefixFilename(relPath, packageName);
    const src = join(configsDir, relPath);
    const dest = join(cwd, prefixed);
    await mkdir(dirname(dest), { recursive: true });
    await copyFile(src, dest);
    copied.push(prefixed);
  }

  // Update manifest
  const manifest = await readManifest(cwd);
  manifest[packageName] = copied;
  await writeManifest(cwd, manifest);

  return copied;
}

/**
 * Remove all config files for a package using the manifest.
 */
export async function removeConfigs(
  cwd: string,
  packageName: string,
): Promise<string[]> {
  const manifest = await readManifest(cwd);
  const files = manifest[packageName];
  if (!files || files.length === 0) return [];

  const removed: string[] = [];
  for (const relPath of files) {
    try {
      await unlink(join(cwd, relPath));
      removed.push(relPath);
    } catch {
      // File already gone
    }
  }

  delete manifest[packageName];
  await writeManifest(cwd, manifest);
  return removed;
}
