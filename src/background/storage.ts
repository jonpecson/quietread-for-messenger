import { getSettings, updateSettings } from '../shared/settings';
import { enableReadReceiptBlocking, disableReadReceiptBlocking } from './dnr-rules';
import { log } from '../shared/logger';

export async function initializeStorage(): Promise<void> {
  const settings = await getSettings();
  log('Initialized with settings:', settings);
  if (settings.protectionEnabled) {
    await enableReadReceiptBlocking();
  }
}

export async function handleProtectionToggle(enabled: boolean): Promise<void> {
  await updateSettings({ protectionEnabled: enabled });
  if (enabled) {
    await enableReadReceiptBlocking();
  } else {
    await disableReadReceiptBlocking();
  }
  log('Protection toggled:', enabled);
}

export async function handleDebugToggle(enabled: boolean): Promise<void> {
  await updateSettings({ debugEnabled: enabled });
  log('Debug mode toggled:', enabled);
}
