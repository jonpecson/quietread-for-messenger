import { detectSite } from './site-detection';
import { createStatusPill, updateStatusPill, removeStatusPill } from './page-status-pill';
import { initThreadGuard } from './thread-guard';
import { MESSAGE_TYPES } from '../shared/constants';
import type { QuietReadSettings } from '../shared/types';

const site = detectSite();
let hookInjected = false;

if (site) {
  init();
}

function init(): void {
  console.log('[QuietRead] Content script active on:', site);

  chrome.runtime.sendMessage({ type: MESSAGE_TYPES.GET_STATUS }, (response) => {
    if (response?.settings) {
      const settings: QuietReadSettings = response.settings;
      if (settings.showStatusPill) {
        createStatusPill(settings.protectionEnabled);
      }
      // Inject the page hook whenever protection OR debug is on
      if (settings.protectionEnabled || settings.debugEnabled) {
        injectPageHook();
      }
      // Relay current state to the injected hook
      relayStateToHook(settings);
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
      // Ensure hook is injected if needed
      if (settings.protectionEnabled || settings.debugEnabled) {
        injectPageHook();
      }
      // Relay updated state
      relayStateToHook(settings);
    }
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

function injectPageHook(): void {
  if (hookInjected) return;
  hookInjected = true;

  try {
    const script = document.createElement('script');
    script.src = chrome.runtime.getURL('injected/fetch-xhr-hook.js');
    script.type = 'module';
    (document.head || document.documentElement).appendChild(script);
    script.onload = () => script.remove();
    console.log('[QuietRead] Page hook injected');
  } catch (e) {
    console.warn('[QuietRead] Failed to inject page hook:', e);
    hookInjected = false;
  }

  // Listen for observations from the injected hook
  window.addEventListener('message', (event) => {
    if (event.source !== window) return;
    if (event.data?.source !== 'quietread-hook') return;

    chrome.runtime.sendMessage({
      type: MESSAGE_TYPES.REQUEST_OBSERVED,
      entry: event.data.entry,
    });
  });
}
