/**
 * Page-level instrumentation hook for debug/research mode.
 * Wraps fetch() and XMLHttpRequest to observe network requests
 * and relay sanitized metadata to the content script.
 *
 * PRIVACY: Only captures URL, method, and timestamp.
 * Does NOT capture request bodies, auth tokens, or message content.
 *
 * This script runs in the PAGE context (not the extension context).
 * It communicates with the content script via window.postMessage.
 */

const READ_RECEIPT_PATTERNS = [
  'mark_read',
  'read_receipt',
  'ReadReceipt',
  'change_read_status',
  'thread_read_state',
  'mark_seen',
  'MarkSeen',
  'MarkRead',
];

function isCandidate(url: string): boolean {
  return READ_RECEIPT_PATTERNS.some((p) => url.includes(p));
}

function sanitizeUrl(url: string): string {
  try {
    const u = new URL(url);
    // Strip query params to avoid leaking tokens
    return `${u.origin}${u.pathname}`;
  } catch {
    return '[unparseable]';
  }
}

function relayEntry(url: string, method: string, type: 'fetch' | 'xhr'): void {
  window.postMessage(
    {
      source: 'quietread-hook',
      entry: {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        timestamp: Date.now(),
        url: sanitizeUrl(url),
        method,
        type,
        blocked: false,
        note: isCandidate(url) ? 'Candidate read-receipt request' : undefined,
      },
    },
    '*'
  );
}

// --- Wrap fetch ---
const originalFetch = window.fetch;
window.fetch = function (input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
  const method = init?.method ?? 'GET';

  if (isCandidate(url)) {
    relayEntry(url, method, 'fetch');
  }

  return originalFetch.call(this, input, init);
};

// --- Wrap XMLHttpRequest ---
const originalOpen = XMLHttpRequest.prototype.open;
XMLHttpRequest.prototype.open = function (method: string, url: string | URL, ...rest: unknown[]): void {
  const urlStr = typeof url === 'string' ? url : url.href;
  (this as XMLHttpRequest & { _quietread_url: string })._quietread_url = urlStr;
  (this as XMLHttpRequest & { _quietread_method: string })._quietread_method = method;
  return (originalOpen as (...args: unknown[]) => void).call(this, method, url, ...rest);
};

const originalSend = XMLHttpRequest.prototype.send;
XMLHttpRequest.prototype.send = function (body?: Document | XMLHttpRequestBodyInit | null): void {
  const xhr = this as XMLHttpRequest & { _quietread_url?: string; _quietread_method?: string };
  if (xhr._quietread_url && isCandidate(xhr._quietread_url)) {
    relayEntry(xhr._quietread_url, xhr._quietread_method ?? 'GET', 'xhr');
  }
  return originalSend.call(this, body);
};

console.log('[QuietRead] Debug instrumentation hook active');
