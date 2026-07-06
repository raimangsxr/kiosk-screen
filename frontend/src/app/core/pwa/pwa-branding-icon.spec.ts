import { DEFAULT_PWA_ICON, upsertPwaIconLink } from './pwa-branding-icon';

describe('pwa-branding-icon', () => {
  beforeEach(() => {
    document.head.querySelectorAll('link[rel="icon"], link[rel="apple-touch-icon"]').forEach((node) => {
      node.remove();
    });
  });

  it('creates icon links when missing', () => {
    upsertPwaIconLink('icon', DEFAULT_PWA_ICON);
    upsertPwaIconLink('apple-touch-icon', DEFAULT_PWA_ICON);

    expect(document.head.querySelector('link[rel="icon"]')?.getAttribute('href')).toBe(DEFAULT_PWA_ICON);
    expect(document.head.querySelector('link[rel="apple-touch-icon"]')?.getAttribute('href')).toBe(DEFAULT_PWA_ICON);
  });

  it('updates existing icon links', () => {
    upsertPwaIconLink('icon', DEFAULT_PWA_ICON);
    upsertPwaIconLink('icon', 'data:image/png;base64,abc');

    const links = document.head.querySelectorAll('link[rel="icon"]');
    expect(links.length).toBe(1);
    expect(links[0]?.getAttribute('href')).toBe('data:image/png;base64,abc');
  });
});
