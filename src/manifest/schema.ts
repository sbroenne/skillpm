import { z } from 'zod';

export const SkillpmFieldSchema = z
  .object({
    mcpServers: z.array(z.string()).optional(),
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
}
