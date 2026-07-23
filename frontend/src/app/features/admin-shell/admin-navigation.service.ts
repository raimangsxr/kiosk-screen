import { Injectable } from '@angular/core';

import { AdminNavGroup, AdminNavigationItem, AdminQuickAction } from '../../shared/admin-ui.models';
import { ADMIN_COPY } from '../../shared/ui/admin/admin-copy';

const ICONS: Record<string, string> = {
  '/admin': 'dashboard',
  '/admin/content': 'photo_library',
  '/admin/ads': 'campaign',
  '/admin/event': 'event',
  '/admin/iframes': 'web_asset',
  '/admin/configuration': 'tune',
  '/admin/readiness': 'fact_check',
  '/admin/remote-control': 'cast_connected',
  '/admin/users': 'group',
  '/admin/api-keys': 'vpn_key'
};

function withIcons(items: AdminNavigationItem[]): AdminNavigationItem[] {
  return items.map((item) => ({
    ...item,
    icon: item.icon ?? ICONS[item.route] ?? 'arrow_forward'
  }));
}

@Injectable({ providedIn: 'root' })
export class AdminNavigationService {
  readonly groups: readonly AdminNavGroup[] = [
    {
      id: 'operation',
      label: ADMIN_COPY.navGroups.operation,
      items: withIcons([
        { label: 'Panel', route: '/admin', summary: 'Estado y accesos rápidos', exact: true },
        { label: 'Contenido', route: '/admin/content', summary: 'Fotos y vídeos de la zona superior' },
        { label: 'Anuncios', route: '/admin/ads', summary: 'Anuncios de clientes en la zona inferior' },
        { label: 'Control remoto', route: '/admin/remote-control', summary: 'Modo de contenido y visibilidad de anuncios' },
        { label: 'Comprobación', route: '/admin/readiness', summary: 'Verificaciones previas al quiosco' }
      ])
    },
    {
      id: 'configuration',
      label: ADMIN_COPY.navGroups.configuration,
      items: withIcons([
        { label: 'Evento', route: '/admin/event', summary: 'Organizador, nombre, logo y duración' },
        { label: 'Pantalla', route: '/admin/configuration', summary: 'Rotación, animación y valores por defecto' },
        { label: 'Iframes', route: '/admin/iframes', summary: 'Vistas web para control remoto' }
      ])
    },
    {
      id: 'access',
      label: ADMIN_COPY.navGroups.access,
      items: withIcons([
        { label: 'Usuarios', route: '/admin/users', summary: 'Acceso y roles de operadores' },
        { label: 'Claves API', route: '/admin/api-keys', summary: 'Tokens para subidas externas' }
      ])
    }
  ];

  readonly allItems: readonly AdminNavigationItem[] = this.groups.flatMap((g) => g.items);

  /** @deprecated Use `allItems` or `groups`. Kept for dashboard compatibility during migration. */
  readonly items: readonly AdminNavigationItem[] = this.allItems;

  readonly quickActions: AdminQuickAction[] = [
    {
      label: 'Añadir contenido',
      route: '/admin/content/new',
      description: 'Sube fotos o vídeos para la zona superior.'
    },
    {
      label: 'Añadir anuncio',
      route: '/admin/ads/new',
      description: 'Sube imágenes de anuncios para la zona inferior.'
    },
    {
      label: 'Control remoto',
      route: '/admin/remote-control',
      description: 'Cambia el modo de contenido del quiosco en vivo.'
    },
    {
      label: 'Comprobación',
      route: '/admin/readiness',
      description: 'Ejecuta las verificaciones previas al evento.'
    }
  ];

  iconFor(route: string): string {
    return ICONS[route] ?? 'arrow_forward';
  }

  /**
   * Resolves the navigation group a URL belongs to (Operación / Configuración
   * / Acceso) by matching against the deepest nav item that prefixes the URL.
   * Used as the page-header eyebrow so operators always see which area of the
   * admin they are in, instead of a static "Administración" label.
   */
  groupLabelFor(url: string): string {
    const path = url.split('?')[0];
    const urlSegments = path.split('/').filter(Boolean);
    let best: { group: string; depth: number } | null = null;
    for (const group of this.groups) {
      for (const item of group.items) {
        const segments = item.route.split('/').filter(Boolean);
        if (segments.length > urlSegments.length) {
          continue;
        }
        const prefix = segments.join('/');
        const urlPrefix = urlSegments.slice(0, segments.length).join('/');
        if (prefix !== urlPrefix) {
          continue;
        }
        if (!best || segments.length > best.depth) {
          best = { group: group.label, depth: segments.length };
        }
      }
    }
    return best?.group ?? ADMIN_COPY.eyebrow;
  }
}
