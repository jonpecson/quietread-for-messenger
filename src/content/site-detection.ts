export type SupportedSite = 'messenger' | 'facebook-messages' | null;

export function detectSite(): SupportedSite {
  const { hostname, pathname } = window.location;
  if (hostname === 'www.messenger.com') return 'messenger';
  if (hostname === 'www.facebook.com' && pathname.startsWith('/messages')) return 'facebook-messages';
  return null;
}

export function isSupportedSite(): boolean {
  return detectSite() !== null;
}
