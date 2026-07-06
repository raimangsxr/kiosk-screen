export const DEFAULT_PWA_ICON = 'icons/icon-192x192.png';

export type PwaIconLinkRel = 'icon' | 'apple-touch-icon';

export function upsertPwaIconLink(rel: PwaIconLinkRel, href: string, sizes = '192x192'): void {
  const selector = rel === 'icon'
    ? 'link[rel="icon"]'
    : 'link[rel="apple-touch-icon"]';
  let link = document.head.querySelector<HTMLLinkElement>(selector);

  if (!link) {
    link = document.createElement('link');
    link.rel = rel;
    document.head.appendChild(link);
  }

  link.type = 'image/png';
  link.sizes = sizes;
  link.href = href;
}

export function renderSquarePwaIcon(sourceUrl: string, size = 192): Promise<string> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.crossOrigin = 'anonymous';
    image.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = size;
        canvas.height = size;
        const context = canvas.getContext('2d');
        if (!context) {
          reject(new Error('Canvas context unavailable'));
          return;
        }

        context.fillStyle = '#ffffff';
        context.fillRect(0, 0, size, size);

        const scale = Math.min(size / image.width, size / image.height);
        const width = image.width * scale;
        const height = image.height * scale;
        const x = (size - width) / 2;
        const y = (size - height) / 2;
        context.drawImage(image, x, y, width, height);

        resolve(canvas.toDataURL('image/png'));
      } catch (error) {
        reject(error);
      }
    };
    image.onerror = () => reject(new Error(`Failed to load icon source: ${sourceUrl}`));
    image.src = sourceUrl;
  });
}
