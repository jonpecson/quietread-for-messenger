import { describe, it, expect } from 'vitest';

// We need to mock window.location since vitest runs in Node
function detectSiteFromUrl(hostname: string, pathname: string): 'messenger' | 'facebook-messages' | null {
  if (hostname === 'www.messenger.com') return 'messenger';
  if (hostname === 'www.facebook.com' && pathname.startsWith('/messages')) return 'facebook-messages';
  return null;
}

describe('site-detection', () => {
  it('detects messenger.com', () => {
    expect(detectSiteFromUrl('www.messenger.com', '/')).toBe('messenger');
    expect(detectSiteFromUrl('www.messenger.com', '/t/12345')).toBe('messenger');
  });

  it('detects facebook.com/messages', () => {
    expect(detectSiteFromUrl('www.facebook.com', '/messages')).toBe('facebook-messages');
    expect(detectSiteFromUrl('www.facebook.com', '/messages/t/12345')).toBe('facebook-messages');
  });

  it('returns null for unsupported sites', () => {
    expect(detectSiteFromUrl('www.google.com', '/')).toBe(null);
    expect(detectSiteFromUrl('www.facebook.com', '/profile')).toBe(null);
    expect(detectSiteFromUrl('messenger.com', '/')).toBe(null);
  });
});
