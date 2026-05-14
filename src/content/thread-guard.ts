import { MESSAGE_TYPES } from '../shared/constants';

const TOAST_ID = 'quietread-thread-toast';

export function initThreadGuard(): void {
  // Watch for clicks on conversation list items when protection is off
  document.addEventListener('click', handleConversationClick, true);
}

function handleConversationClick(event: MouseEvent): void {
  const target = event.target as HTMLElement;
  if (!target) return;

  // Messenger conversation list items are typically links inside the chat list
  const link = target.closest('a[href*="/t/"], a[href*="messages/t/"]');
  if (!link) return;

  try {
    void chrome.runtime.id; // throws if context invalidated
    chrome.runtime.sendMessage({ type: MESSAGE_TYPES.GET_STATUS }, (response) => {
      try { void chrome.runtime.id; } catch { return; }
      if (chrome.runtime.lastError) return;
      if (response?.settings && !response.settings.protectionEnabled) {
        showWarningToast();
      }
    });
  } catch {
    // Extension context invalidated
  }
}

function showWarningToast(): void {
  if (document.getElementById(TOAST_ID)) return;

  const toast = document.createElement('div');
  toast.id = TOAST_ID;
  toast.textContent = 'QuietRead protection is off. Opening this thread may mark messages as seen.';

  Object.assign(toast.style, {
    position: 'fixed',
    top: '16px',
    left: '50%',
    transform: 'translateX(-50%)',
    zIndex: '2147483647',
    padding: '10px 18px',
    borderRadius: '8px',
    fontSize: '13px',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    fontWeight: '500',
    color: '#fff',
    backgroundColor: '#9a6700',
    boxShadow: '0 2px 12px rgba(0,0,0,0.25)',
    transition: 'opacity 0.3s',
  });

  document.body.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}
