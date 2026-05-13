import { initializeStorage } from './storage';
import { setupMessageListeners } from './messaging';
import { log } from '../shared/logger';

log('Service worker starting');

chrome.runtime.onInstalled.addListener(async () => {
  log('Extension installed/updated');
  await initializeStorage();
});

chrome.runtime.onStartup.addListener(async () => {
  log('Browser started');
  await initializeStorage();
});

setupMessageListeners();

log('Service worker ready');
