import { beforeEach, describe, expect, it, vi } from 'vitest';
import { uninstall } from './uninstall.js';
import { wireSkills } from './install.js';
import { npm, log } from '../utils/index.js';

vi.mock('./install.js', () => ({ wireSkills: vi.fn() }));
vi.mock('../utils/index.js', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../utils/index.js')>();
  return {
    ...actual,
    npm: vi.fn(),
    log: { ...actual.log, warn: vi.fn() },
  };
});

describe('uninstall', () => {
  beforeEach(() => {
    vi.mocked(npm).mockReset().mockResolvedValue({ stdout: '', stderr: '' });
    vi.mocked(wireSkills).mockReset().mockResolvedValue();
    vi.mocked(log.warn).mockClear();
  });

  it('refreshes remaining skills and explains that copied installations may remain', async () => {
    await uninstall(['old-skill'], '/project');
    expect(npm).toHaveBeenCalledWith(['uninstall', 'old-skill'], {
      cwd: '/project',
    });
    expect(wireSkills).toHaveBeenCalledWith('/project');
    expect(log.warn).toHaveBeenCalledWith(
      expect.stringContaining('may still have copies'),
    );
  });

  it('propagates failures to refresh remaining skills', async () => {
    vi.mocked(wireSkills).mockRejectedValue(new Error('Cannot refresh skills'));
    await expect(uninstall(['old-skill'], '/project')).rejects.toThrow(
      'Cannot refresh skills',
    );
  });
});
