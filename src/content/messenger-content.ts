import { detectSite } from './site-detection';
import { createStatusPill, updateStatusPill, removeStatusPill } from './page-status-pill';
import { initThreadGuard } from './thread-guard';
import { MESSAGE_TYPES } from '../shared/constants';
import type { QuietReadSettings } from '../shared/types';

const site = detectSite();

if (site) {
  init();
}

function init(): void {
  console.log('[QuietRead] Content script active on:', site);

  // Get initial settings and show pill
  chrome.runtime.sendMessage({ type: MESSAGE_TYPES.GET_STATUS }, (response) => {
    if (response?.settings) {
      const settings: QuietReadSettings = response.settings;
      if (settings.showStatusPill) {
        createStatusPill(settings.protectionEnabled);
      }
      if (settings.debugEnabled) {
        injectDebugHook();
      }
    }
  });

  // Listen for settings updates from background
  chrome.runtime.onMessage.addListener((message) => {
    if (message.type === MESSAGE_TYPES.STATUS_UPDATE) {
      const settings: QuietReadSettings = message.settings;
      if (settings.showStatusPill) {
        updateStatusPill(settings.protectionEnabled);
      } else {
        removeStatusPill();
      }
    }
  });

  // Init thread click guardrails
  initThreadGuard();
}

function injectDebugHook(): void {
  try {
    const script = document.createElement('script');
    script.src = chrome.runtime.getURL('injected/fetch-xhr-hook.js');
    script.type = 'module';
    (document.head || document.documentElement).appendChild(script);
    script.onload = () => script.remove();
    console.log('[QuietRead] Debug instrumentation hook injected');
  } catch (e) {
    console.warn('[QuietRead] Failed to inject debug hook:', e);
  }

  // Listen for observed requests relayed from injected script via window messages
  window.addEventListener('message', (event) => {
    if (event.source !== window) return;
    if (event.data?.source !== 'quietread-hook') return;

    chrome.runtime.sendMessage({
      type: MESSAGE_TYPES.REQUEST_OBSERVED,
      entry: event.data.entry,
    });
  });
}
