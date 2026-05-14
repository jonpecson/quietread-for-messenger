/**
 * Early injector — runs at document_start BEFORE any page scripts.
 * Its sole job is to inject the page-level hook script synchronously
 * so that fetch, XHR, and WebSocket are wrapped before Messenger's
 * JavaScript executes and opens connections.
 */

const script = document.createElement('script');
script.src = chrome.runtime.getURL('injected/fetch-xhr-hook.js');
// Must NOT be type="module" — modules are deferred and would run after page scripts
script.setAttribute('data-quietread', 'hook');
(document.documentElement || document.head).appendChild(script);
// Don't remove — needs to execute synchronously before any page script
console.log('[QuietRead] Early hook injection at document_start');
