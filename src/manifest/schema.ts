import { z } from 'zod';

export const SkillpmFieldSchema = z
  .object({
    mcpServers: z.array(z.string()).optional(),
    configPrefix: z.string().optional(),
  })
  .strict()
  .optional();

export type SkillpmField = z.infer<typeof SkillpmFieldSchema>;

export interface SkillPackageJson {
  name: string;
  version: string;
  keywords?: string[];
  dependencies?: Record<string, string>;
  skillpm?: SkillpmField;
}

export interface SkillInfo {
  name: string;
  version: string;
  path: string;
  /** Path to the directory containing SKILL.md */
  skillDir: string;
  mcpServers: string[];
  /** True if SKILL.md is at package root instead of skills/<name>/ */
  legacy?: boolean;
  /** Path to configs/ directory if present (mirrors workspace layout) */
  configsDir?: string;
  /**
   * Optional prefix override for config file naming.
   * When set, used instead of the (de-scoped) package name.
   * e.g. configPrefix: "react" → "react-briefing.md"
   * Declared via skillpm.configPrefix in package.json.
   */
  configPrefix?: string;
  /**
   * True when the package was found via a symlink in node_modules/ — typically
   * an npm workspace package (first-party skill in the same monorepo).
   */
  workspace?: boolean;
}
