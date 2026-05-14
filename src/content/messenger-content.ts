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
 * Safely send a message to the background service worker.
 * After extension reload/update, the old content script's chrome.runtime
 * context is invalidated. This wraps calls to avoid uncaught errors.
 */
function safeSendMessage(message: unknown, callback?: (response: unknown) => void): void {
  try {
    if (!chrome.runtime?.id) return; // context already invalidated
    chrome.runtime.sendMessage(message, (response) => {
      if (chrome.runtime.lastError) {
        // Extension was reloaded — silently ignore
        return;
      }
      callback?.(response);
    });
  } catch {
    // Extension context invalidated — nothing to do
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

  chrome.runtime.onMessage.addListener((message) => {
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
