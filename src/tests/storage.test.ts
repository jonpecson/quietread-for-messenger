import { describe, it, expect, vi, beforeEach } from 'vitest';
import { DEFAULTS } from '../shared/constants';

// Mock chrome.storage.local
const mockStorage: Record<string, unknown> = {};

const chromeStorageMock = {
  local: {
    get: vi.fn((keys: string[]) => {
      const result: Record<string, unknown> = {};
      for (const key of keys) {
        if (key in mockStorage) result[key] = mockStorage[key];
      }
      return Promise.resolve(result);
    }),
    set: vi.fn((items: Record<string, unknown>) => {
      Object.assign(mockStorage, items);
      return Promise.resolve();
    }),
    clear: vi.fn(() => {
      for (const key of Object.keys(mockStorage)) delete mockStorage[key];
      return Promise.resolve();
    }),
  },
};

vi.stubGlobal('chrome', { storage: chromeStorageMock });

// Now import the module under test
const { getSettings, updateSettings, resetSettings } = await import('../shared/settings');

describe('settings', () => {
  beforeEach(() => {
    for (const key of Object.keys(mockStorage)) delete mockStorage[key];
    vi.clearAllMocks();
  });

  it('returns defaults when no settings are stored', async () => {
    const settings = await getSettings();
    expect(settings.protectionEnabled).toBe(DEFAULTS.protectionEnabled);
    expect(settings.debugEnabled).toBe(DEFAULTS.debugEnabled);
    expect(settings.showStatusPill).toBe(DEFAULTS.showStatusPill);
  });

  it('updates partial settings', async () => {
    const updated = await updateSettings({ protectionEnabled: false });
    expect(updated.protectionEnabled).toBe(false);
    expect(updated.debugEnabled).toBe(DEFAULTS.debugEnabled);
  });

  it('persists updated settings', async () => {
    await updateSettings({ debugEnabled: true });
    const settings = await getSettings();
    expect(settings.debugEnabled).toBe(true);
  });

  it('resets settings to defaults', async () => {
    await updateSettings({ protectionEnabled: false, debugEnabled: true });
    const reset = await resetSettings();
    expect(reset.protectionEnabled).toBe(true);
    expect(reset.debugEnabled).toBe(false);
  });
});
