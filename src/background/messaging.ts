import { getSettings } from '../shared/settings';
import { getRuleStatus } from './dnr-rules';
import { addDebugEntry, getDebugEntries } from '../shared/logger';
import { handleProtectionToggle, handleDebugToggle } from './storage';
import { MESSAGE_TYPES } from '../shared/constants';
import type { MessageType, DiagnosticsData } from '../shared/types';

export function setupMessageListeners(): void {
  chrome.runtime.onMessage.addListener((message: MessageType, _sender, sendResponse) => {
    handleMessage(message).then(sendResponse);
    return true; // keep channel open for async response
  });
}

async function handleMessage(message: MessageType): Promise<unknown> {
  switch (message.type) {
    case MESSAGE_TYPES.GET_STATUS: {
      const settings = await getSettings();
      const ruleStatus = await getRuleStatus();
      return { settings, ruleStatus };
    }

    case MESSAGE_TYPES.TOGGLE_PROTECTION: {
      await handleProtectionToggle(message.enabled);
      const settings = await getSettings();
      const ruleStatus = await getRuleStatus();
      broadcastToContentScripts({ type: MESSAGE_TYPES.STATUS_UPDATE, settings });
      return { settings, ruleStatus };
    }

    case MESSAGE_TYPES.TOGGLE_DEBUG: {
      await handleDebugToggle(message.enabled);
      const settings = await getSettings();
      return { settings };
    }

    case MESSAGE_TYPES.REQUEST_OBSERVED: {
      await addDebugEntry(message.entry);
      return { ok: true };
    }

    case MESSAGE_TYPES.GET_DIAGNOSTICS: {
      const settings = await getSettings();
      const ruleStatus = await getRuleStatus();
      const entries = await getDebugEntries();
      const data: DiagnosticsData = {
        hostname: 'background',
        protectionEnabled: settings.protectionEnabled,
        ruleStatus,
        observedRequests: entries.length,
        recentEntries: entries.slice(0, 10),
      };
      return data;
    }

    default:
      return { error: 'Unknown message type' };
  }
}

function broadcastToContentScripts(message: MessageType): void {
  chrome.tabs.query({ url: ['https://www.messenger.com/*', 'https://www.facebook.com/messages/*'] }, (tabs) => {
    for (const tab of tabs) {
      if (tab.id) {
        chrome.tabs.sendMessage(tab.id, message).catch(() => {
          // Tab may not have content script loaded
        });
      }
    }
  });
}
