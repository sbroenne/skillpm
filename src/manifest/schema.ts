export interface SkillPackageJson {
  name: string;
  version: string;
  keywords?: string[];
  dependencies?: Record<string, string>;
}

export interface SkillInfo {
  name: string;
  version: string;
  path: string;
  /** Path to the directory containing SKILL.md */
  skillDir: string;
  /** True if SKILL.md is at package root instead of skills/<name>/ */
  legacy?: boolean;
  /** True when the package was found via a symlink in node_modules/. */
  workspace?: boolean;
}
