export const EXTENSION_NAME = 'QuietRead for Messenger';
export const EXTENSION_TAGLINE = 'Read with breathing room.';

export const MESSENGER_PATTERNS = [
  'https://www.messenger.com/*',
  'https://www.facebook.com/messages/*',
] as const;

export const STORAGE_KEYS = {
  PROTECTION_ENABLED: 'protectionEnabled',
  DEBUG_ENABLED: 'debugEnabled',
  SHOW_STATUS_PILL: 'showStatusPill',
  DEBUG_LOG: 'debugLog',
} as const;

export const DEFAULTS = {
  protectionEnabled: true,
  debugEnabled: false,
  showStatusPill: true,
} as const;

export const MESSAGE_TYPES = {
  GET_STATUS: 'quietread:get-status',
  STATUS_UPDATE: 'quietread:status-update',
  TOGGLE_PROTECTION: 'quietread:toggle-protection',
  TOGGLE_DEBUG: 'quietread:toggle-debug',
  REQUEST_OBSERVED: 'quietread:request-observed',
  RULE_STATUS: 'quietread:rule-status',
  GET_DIAGNOSTICS: 'quietread:get-diagnostics',
  DIAGNOSTICS_RESPONSE: 'quietread:diagnostics-response',
} as const;

export const DNR_RULE_ID_START = 1000;
export const MAX_DEBUG_ENTRIES = 50;
