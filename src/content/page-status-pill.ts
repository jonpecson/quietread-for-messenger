const PILL_ID = 'quietread-status-pill';

let pillElement: HTMLElement | null = null;

export function createStatusPill(protectionEnabled: boolean): void {
  removeStatusPill();

  const pill = document.createElement('div');
  pill.id = PILL_ID;
  pill.setAttribute('role', 'status');
  pill.setAttribute('aria-live', 'polite');

  Object.assign(pill.style, {
    position: 'fixed',
    bottom: '16px',
    right: '16px',
    zIndex: '2147483647',
    padding: '8px 14px',
    borderRadius: '20px',
    fontSize: '13px',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    fontWeight: '500',
    color: '#fff',
    cursor: 'pointer',
    transition: 'opacity 0.2s, transform 0.2s',
    boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
    userSelect: 'none',
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
  });

  updatePillState(pill, protectionEnabled);

  pill.addEventListener('click', () => {
    pill.style.opacity = '0';
    pill.style.transform = 'translateY(8px)';
    setTimeout(() => pill.remove(), 200);
    pillElement = null;
  });

  pill.title = 'Click to dismiss';
  document.body.appendChild(pill);
  pillElement = pill;
}

export function updateStatusPill(protectionEnabled: boolean): void {
  if (!pillElement || !document.body.contains(pillElement)) {
    createStatusPill(protectionEnabled);
    return;
  }
  updatePillState(pillElement, protectionEnabled);
}

export function removeStatusPill(): void {
  const existing = document.getElementById(PILL_ID);
  if (existing) existing.remove();
  pillElement = null;
}

function updatePillState(pill: HTMLElement, enabled: boolean): void {
  const dot = enabled ? '\u25CF' : '\u25CB'; // filled vs hollow circle
  pill.textContent = `${dot} QuietRead: Protection ${enabled ? 'ON' : 'OFF'}`;
  pill.style.backgroundColor = enabled ? '#1a7f37' : '#9a6700';
}
