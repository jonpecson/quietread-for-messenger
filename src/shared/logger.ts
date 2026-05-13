import { MAX_DEBUG_ENTRIES, STORAGE_KEYS } from './constants';
import type { DebugLogEntry } from './types';

const PREFIX = '[QuietRead]';

export function log(...args: unknown[]): void {
  console.log(PREFIX, ...args);
}

export function warn(...args: unknown[]): void {
  console.warn(PREFIX, ...args);
}

export function error(...args: unknown[]): void {
  console.error(PREFIX, ...args);
}

export async function addDebugEntry(entry: DebugLogEntry): Promise<void> {
  const result = await chrome.storage.local.get(STORAGE_KEYS.DEBUG_LOG);
  const entries: DebugLogEntry[] = result[STORAGE_KEYS.DEBUG_LOG] ?? [];
  entries.unshift(entry);
  if (entries.length > MAX_DEBUG_ENTRIES) {
    entries.length = MAX_DEBUG_ENTRIES;
  }
  await chrome.storage.local.set({ [STORAGE_KEYS.DEBUG_LOG]: entries });
}

export async function getDebugEntries(): Promise<DebugLogEntry[]> {
  const result = await chrome.storage.local.get(STORAGE_KEYS.DEBUG_LOG);
  return result[STORAGE_KEYS.DEBUG_LOG] ?? [];
}

export async function clearDebugEntries(): Promise<void> {
  await chrome.storage.local.set({ [STORAGE_KEYS.DEBUG_LOG]: [] });
}
