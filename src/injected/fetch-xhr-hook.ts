/**
 * Page-level interception hook for Messenger read receipts.
 *
 * Modern Messenger sends read receipts as GraphQL mutations via generic
 * endpoints (e.g. /api/graphql/). The mutation name is in the POST body,
 * NOT the URL — so declarativeNetRequest (URL-only) can't catch them.
 *
 * This script runs in the PAGE context and wraps fetch() / XMLHttpRequest
 * to inspect request bodies and block read-receipt mutations.
 *
 * PRIVACY: Only inspects for known mutation names. Does NOT capture
 * message content, auth tokens, or full request bodies.
 */

// Patterns found in URLs
const URL_PATTERNS = [
  'mark_read',
  'read_receipt',
  'ReadReceipt',
  'change_read_status',
  'thread_read_state',
  'mark_seen',
  'MarkSeen',
  'MarkRead',
];

// Patterns found in GraphQL POST bodies (doc_id labels, variable names, mutation names)
const BODY_PATTERNS = [
  'ReadReceipt',
  'MarkRead',
  'mark_read',
  'MWChatMarkRead',
  'markRead',
  'MarkThreadRead',
  'mark_seen',
  'MarkSeen',
  'ThreadMarkRead',
  'read_watermark',
  'ReadWatermark',
  'LSMarkThreadRead',
  'change_read_status',
];

// State: controlled by the content script via window messages
let protectionEnabled = true;
let debugEnabled = false;

// Listen for state updates from the content script
window.addEventListener('message', (event) => {
  if (event.source !== window) return;
  if (event.data?.source === 'quietread-control') {
    if (typeof event.data.protectionEnabled === 'boolean') {
      protectionEnabled = event.data.protectionEnabled;
    }
    if (typeof event.data.debugEnabled === 'boolean') {
      debugEnabled = event.data.debugEnabled;
    }
    console.log('[QuietRead] Hook state updated — protection:', protectionEnabled, 'debug:', debugEnabled);
  }
});

function extractBodyString(body: BodyInit | null | undefined): string | null {
  if (!body) return null;
  if (typeof body === 'string') return body;
  if (body instanceof URLSearchParams) return body.toString();
  if (body instanceof FormData) {
    // FormData: check common field names where mutation info lives
    const parts: string[] = [];
    body.forEach((value, key) => {
      if (typeof value === 'string' && (key === 'fb_api_req_friendly_name' || key === 'variables' || key === 'doc_id' || key === 'q' || key === 'query_name')) {
        parts.push(`${key}=${value}`);
      }
    });
    return parts.join('&');
  }
  return null;
}

function sanitizeUrl(url: string): string {
  try {
    const u = new URL(url);
    return `${u.origin}${u.pathname}`;
  } catch {
    return '[unparseable]';
  }
}

function relayEntry(url: string, method: string, type: 'fetch' | 'xhr', blocked: boolean, matchedPattern?: string): void {
  window.postMessage(
    {
      source: 'quietread-hook',
      entry: {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        timestamp: Date.now(),
        url: sanitizeUrl(url),
        method,
        type,
        blocked,
        note: matchedPattern ? `Matched: ${matchedPattern}` : undefined,
      },
    },
    '*'
  );
}

function findMatchedPattern(url: string, bodyStr: string | null): string | null {
  for (const p of URL_PATTERNS) {
    if (url.includes(p)) return `url:${p}`;
  }
  if (bodyStr) {
    for (const p of BODY_PATTERNS) {
      if (bodyStr.includes(p)) return `body:${p}`;
    }
  }
  return null;
}

// --- Wrap fetch ---
const originalFetch = window.fetch;
window.fetch = function (input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
  const method = (init?.method ?? 'GET').toUpperCase();

  // Only inspect POST/mutation requests to avoid overhead on GETs
  if (method === 'POST' || method === 'PUT') {
    const bodyStr = extractBodyString(init?.body);
    const matched = findMatchedPattern(url, bodyStr);

    if (matched) {
      if (protectionEnabled) {
        console.log('[QuietRead] BLOCKED fetch:', sanitizeUrl(url), '|', matched);
        relayEntry(url, method, 'fetch', true, matched);
        // Return a fake successful response so Messenger doesn't error/retry
        return Promise.resolve(new Response('{}', {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }));
      }
      if (debugEnabled) {
        console.log('[QuietRead] OBSERVED (not blocked):', sanitizeUrl(url), '|', matched);
        relayEntry(url, method, 'fetch', false, matched);
      }
    }
  }

  return originalFetch.call(this, input, init);
};

// --- Wrap XMLHttpRequest ---
const originalOpen = XMLHttpRequest.prototype.open;
XMLHttpRequest.prototype.open = function (method: string, url: string | URL, ...rest: unknown[]): void {
  const urlStr = typeof url === 'string' ? url : url.href;
  const xhrExt = this as XMLHttpRequest & { _qr_url: string; _qr_method: string };
  xhrExt._qr_url = urlStr;
  xhrExt._qr_method = method;
  return (originalOpen as (...args: unknown[]) => void).call(this, method, url, ...rest);
};

const originalSend = XMLHttpRequest.prototype.send;
XMLHttpRequest.prototype.send = function (body?: Document | XMLHttpRequestBodyInit | null): void {
  const xhr = this as XMLHttpRequest & { _qr_url?: string; _qr_method?: string; _qr_blocked?: boolean };
  const url = xhr._qr_url ?? '';
  const method = (xhr._qr_method ?? 'GET').toUpperCase();

  if (method === 'POST' || method === 'PUT') {
    const bodyStr = typeof body === 'string' ? body : null;
    const matched = findMatchedPattern(url, bodyStr);

    if (matched) {
      if (protectionEnabled) {
        console.log('[QuietRead] BLOCKED XHR:', sanitizeUrl(url), '|', matched);
        relayEntry(url, method, 'xhr', true, matched);
        xhr._qr_blocked = true;
        // Abort instead of sending — simulate a completed request
        Object.defineProperty(this, 'readyState', { value: 4, writable: false, configurable: true });
        Object.defineProperty(this, 'status', { value: 200, writable: false, configurable: true });
        Object.defineProperty(this, 'responseText', { value: '{}', writable: false, configurable: true });
        this.dispatchEvent(new Event('readystatechange'));
        this.dispatchEvent(new Event('load'));
        this.dispatchEvent(new Event('loadend'));
        return;
      }
      if (debugEnabled) {
        console.log('[QuietRead] OBSERVED XHR (not blocked):', sanitizeUrl(url), '|', matched);
        relayEntry(url, method, 'xhr', false, matched);
      }
    }
  }

  return originalSend.call(this, body);
};

console.log('[QuietRead] Page hook active — protection:', protectionEnabled, 'debug:', debugEnabled);
