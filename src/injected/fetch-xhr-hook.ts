/**
 * Page-level interception hook for Messenger read receipts.
 *
 * Messenger uses THREE channels to send read receipts:
 * 1. fetch() — GraphQL mutations via /api/graphql/
 * 2. XMLHttpRequest — legacy AJAX calls
 * 3. WebSocket (MQTT over WS) — real-time Lightspeed protocol
 *
 * The WebSocket channel is the PRIMARY mechanism in modern Messenger.
 * Read state updates are sent as binary-encoded MQTT messages through
 * an already-open WebSocket connection. This hook intercepts all three.
 *
 * PRIVACY: Only inspects for known patterns. Does NOT capture
 * message content, auth tokens, or full payloads.
 */

// --- Pattern definitions ---

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

// Patterns in fetch/XHR POST bodies
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

// Patterns in WebSocket binary/text frames (Lightspeed protocol)
// These appear as string fragments in the binary MQTT payloads
const WS_PATTERNS = [
  'markRead',
  'mark_read',
  'MarkRead',
  'read_receipt',
  'ReadReceipt',
  'mark_seen',
  'MarkSeen',
  'read_watermark',
  'ReadWatermark',
  'threadMarkRead',
  'ThreadMarkRead',
  'LSMarkThreadRead',
  // Lightspeed task/database IDs commonly associated with read state
  '/ls_req',       // Lightspeed request envelope
  'writeMark',     // Lightspeed write marker
];

// --- State management ---

let protectionEnabled = true;
let debugEnabled = false;

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

// --- Utility functions ---

function extractBodyString(body: BodyInit | null | undefined): string | null {
  if (!body) return null;
  if (typeof body === 'string') return body;
  if (body instanceof URLSearchParams) return body.toString();
  if (body instanceof FormData) {
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

type EntryType = 'fetch' | 'xhr' | 'websocket';

function relayEntry(url: string, method: string, type: EntryType, blocked: boolean, matchedPattern?: string): void {
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

/**
 * Extract readable strings from a binary buffer.
 * Messenger's Lightspeed protocol uses a binary format (likely Thrift or
 * custom) over MQTT/WebSocket. Read-receipt task names appear as ASCII
 * string fragments within the binary payload.
 */
function extractStringsFromBinary(data: ArrayBuffer | ArrayBufferView): string {
  let bytes: Uint8Array;
  if (data instanceof ArrayBuffer) {
    bytes = new Uint8Array(data);
  } else {
    bytes = new Uint8Array(data.buffer, data.byteOffset, data.byteLength);
  }

  // Extract ASCII string fragments (4+ chars) from binary data
  const strings: string[] = [];
  let current = '';
  for (const byte of bytes) {
    if (byte >= 32 && byte < 127) {
      current += String.fromCharCode(byte);
    } else {
      if (current.length >= 4) {
        strings.push(current);
      }
      current = '';
    }
  }
  if (current.length >= 4) {
    strings.push(current);
  }
  return strings.join(' ');
}

function findWsPattern(payload: string): string | null {
  for (const p of WS_PATTERNS) {
    if (payload.includes(p)) return `ws:${p}`;
  }
  return null;
}

// --- WebSocket interception ---
// This is the critical layer. Messenger's primary read-receipt channel is
// MQTT over WebSocket (wss://edge-chat.messenger.com/chat).

const OriginalWebSocket = window.WebSocket;

class QuietReadWebSocket extends OriginalWebSocket {
  private _qrUrl: string;

  constructor(url: string | URL, protocols?: string | string[]) {
    super(url, protocols);
    this._qrUrl = typeof url === 'string' ? url : url.href;

    const isMessengerWs =
      this._qrUrl.includes('edge-chat.messenger.com') ||
      this._qrUrl.includes('edge-chat.facebook.com') ||
      this._qrUrl.includes('gateway.messenger.com') ||
      this._qrUrl.includes('.facebook.com/ws') ||
      this._qrUrl.includes('.messenger.com/ws');

    if (isMessengerWs) {
      console.log('[QuietRead] Monitoring Messenger WebSocket:', sanitizeUrl(this._qrUrl));
    }
  }

  send(data: string | ArrayBufferLike | Blob | ArrayBufferView): void {
    // Check outgoing WebSocket messages for read-receipt patterns
    let payload: string | null = null;
    let matched: string | null = null;

    if (typeof data === 'string') {
      payload = data;
      matched = findWsPattern(payload);
    } else if (data instanceof ArrayBuffer || ArrayBuffer.isView(data)) {
      payload = extractStringsFromBinary(
        data instanceof ArrayBuffer ? data : data as ArrayBufferView
      );
      matched = findWsPattern(payload);
    } else if (data instanceof Blob) {
      // Blobs are async — we can't synchronously inspect them.
      // For blobs, we let them through but they're uncommon for MQTT frames.
    }

    if (matched) {
      if (protectionEnabled) {
        console.log('[QuietRead] BLOCKED WebSocket send:', matched);
        relayEntry(this._qrUrl, 'WS-SEND', 'websocket', true, matched);
        // Silently drop the message — don't call super.send()
        return;
      }
      if (debugEnabled) {
        console.log('[QuietRead] OBSERVED WebSocket send (not blocked):', matched);
        relayEntry(this._qrUrl, 'WS-SEND', 'websocket', false, matched);
      }
    }

    super.send(data);
  }
}

// Preserve static properties and prototype chain
Object.defineProperty(QuietReadWebSocket, 'CONNECTING', { value: OriginalWebSocket.CONNECTING });
Object.defineProperty(QuietReadWebSocket, 'OPEN', { value: OriginalWebSocket.OPEN });
Object.defineProperty(QuietReadWebSocket, 'CLOSING', { value: OriginalWebSocket.CLOSING });
Object.defineProperty(QuietReadWebSocket, 'CLOSED', { value: OriginalWebSocket.CLOSED });

// Replace the global WebSocket
(window as unknown as Record<string, unknown>).WebSocket = QuietReadWebSocket;

// --- Wrap fetch ---
const originalFetch = window.fetch;
window.fetch = function (input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
  const method = (init?.method ?? 'GET').toUpperCase();

  if (method === 'POST' || method === 'PUT') {
    const bodyStr = extractBodyString(init?.body);
    const matched = findMatchedPattern(url, bodyStr);

    if (matched) {
      if (protectionEnabled) {
        console.log('[QuietRead] BLOCKED fetch:', sanitizeUrl(url), '|', matched);
        relayEntry(url, method, 'fetch', true, matched);
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
  const xhr = this as XMLHttpRequest & { _qr_url?: string; _qr_method?: string };
  const url = xhr._qr_url ?? '';
  const method = (xhr._qr_method ?? 'GET').toUpperCase();

  if (method === 'POST' || method === 'PUT') {
    const bodyStr = typeof body === 'string' ? body : null;
    const matched = findMatchedPattern(url, bodyStr);

    if (matched) {
      if (protectionEnabled) {
        console.log('[QuietRead] BLOCKED XHR:', sanitizeUrl(url), '|', matched);
        relayEntry(url, method, 'xhr', true, matched);
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

console.log('[QuietRead] Page hook active — protection:', protectionEnabled, 'debug:', debugEnabled,
  '| Intercepting: fetch, XHR, WebSocket');
