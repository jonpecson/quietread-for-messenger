import { STORAGE_KEYS, DEFAULTS } from './constants';
import type { QuietReadSettings } from './types';

export async function getSettings(): Promise<QuietReadSettings> {
  const result = await chrome.storage.local.get([
    STORAGE_KEYS.PROTECTION_ENABLED,
    STORAGE_KEYS.DEBUG_ENABLED,
    STORAGE_KEYS.SHOW_STATUS_PILL,
  ]);
  return {
    protectionEnabled: result[STORAGE_KEYS.PROTECTION_ENABLED] ?? DEFAULTS.protectionEnabled,
    debugEnabled: result[STORAGE_KEYS.DEBUG_ENABLED] ?? DEFAULTS.debugEnabled,
    showStatusPill: result[STORAGE_KEYS.SHOW_STATUS_PILL] ?? DEFAULTS.showStatusPill,
  };
}

export async function updateSettings(partial: Partial<QuietReadSettings>): Promise<QuietReadSettings> {
  const current = await getSettings();
  const updated = { ...current, ...partial };
  await chrome.storage.local.set({
    [STORAGE_KEYS.PROTECTION_ENABLED]: updated.protectionEnabled,
    [STORAGE_KEYS.DEBUG_ENABLED]: updated.debugEnabled,
    [STORAGE_KEYS.SHOW_STATUS_PILL]: updated.showStatusPill,
  });
  return updated;
}

export async function resetSettings(): Promise<QuietReadSettings> {
  await chrome.storage.local.clear();
  return { ...DEFAULTS };
}
