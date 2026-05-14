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

  // The page hook (fetch-xhr-hook.js) is already injected at document_start
  // via manifest content_scripts with world: "MAIN". We just need to relay
  // settings state to it and listen for its observations.

  chrome.runtime.sendMessage({ type: MESSAGE_TYPES.GET_STATUS }, (response) => {
    if (response?.settings) {
      const settings: QuietReadSettings = response.settings;
      if (settings.showStatusPill) {
        createStatusPill(settings.protectionEnabled);
      }
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
      relayStateToHook(settings);
    }
  });

  // Listen for observations from the page hook (MAIN world -> ISOLATED world via postMessage)
  window.addEventListener('message', (event) => {
    if (event.source !== window) return;
    if (event.data?.source !== 'quietread-hook') return;

    chrome.runtime.sendMessage({
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
