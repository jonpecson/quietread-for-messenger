import { detectSite } from './site-detection';
import { createStatusPill, updateStatusPill, removeStatusPill } from './page-status-pill';
import { initThreadGuard } from './thread-guard';
import { MESSAGE_TYPES } from '../shared/constants';
import type { QuietReadSettings } from '../shared/types';

const site = detectSite();

if (site) {
  init();
}

/**
 * Check if the extension context is still valid.
 * After extension reload/update, chrome.runtime.id throws
 * "Extension context invalidated" — optional chaining doesn't help
 * because chrome.runtime is still an object (its .id getter throws).
 */
function isContextValid(): boolean {
  try {
    return !!chrome.runtime.id;
  } catch {
    return false;
  }
}

function safeSendMessage(message: unknown, callback?: (response: unknown) => void): void {
  if (!isContextValid()) return;
  try {
    chrome.runtime.sendMessage(message, (response) => {
      if (!isContextValid()) return;
      if (chrome.runtime.lastError) return;
      callback?.(response);
    });
  } catch {
    // context gone
  }
}

function init(): void {
  console.log('[QuietRead] Content script active on:', site);

  safeSendMessage({ type: MESSAGE_TYPES.GET_STATUS }, (response: unknown) => {
    const res = response as { settings?: QuietReadSettings } | undefined;
    if (res?.settings) {
      if (res.settings.showStatusPill) {
        createStatusPill(res.settings.protectionEnabled);
      }
      relayStateToHook(res.settings);
    }
  });

  try {
    chrome.runtime.onMessage.addListener((message) => {
      if (!isContextValid()) return;
      if (message.type === MESSAGE_TYPES.STATUS_UPDATE) {
        const settings: QuietReadSettings = message.settings;
        if (settings.showStatusPill) {
          updateStatusPill(settings.protectionEnabled);
        } else {
          removeStatusPill();
        }
        relayStateToHook(settings);
      }
    });
  } catch {
    // context gone at registration time
  }

  window.addEventListener('message', (event) => {
    if (event.source !== window) return;
    if (event.data?.source !== 'quietread-hook') return;
    safeSendMessage({
      type: MESSAGE_TYPES.REQUEST_OBSERVED,
      entry: event.data.entry,
    });
  });

  initThreadGuard();
}

function relayStateToHook(settings: QuietReadSettings): void {
  window.postMessage({
    source: 'quietread-control',
    protectionEnabled: settings.protectionEnabled,
    debugEnabled: settings.debugEnabled,
  }, '*');
}
