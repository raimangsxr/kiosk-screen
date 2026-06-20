import { Injectable } from '@angular/core';

import { AdminNavigationItem, AdminQuickAction } from '../../shared/admin-ui.models';

@Injectable({ providedIn: 'root' })
export class AdminNavigationService {
  readonly items: AdminNavigationItem[] = [
    { label: 'Dashboard', route: '/admin', summary: 'Setup status and shortcuts', exact: true },
    { label: 'Content', route: '/admin/content', summary: 'Photos and videos for the top region' },
    { label: 'Iframes', route: '/admin/iframes', summary: 'Pinned web views for remote control' },
    { label: 'Ads', route: '/admin/ads', summary: 'Client ads for the bottom region' },
    { label: 'Display configuration', route: '/admin/configuration', summary: 'Rotation, animation, and kiosk defaults' },
    { label: 'Setup check', route: '/admin/readiness', summary: 'Pre-flight checks for the kiosk' },
    { label: 'Remote control', route: '/admin/remote-control', summary: 'Switch kiosk content mode and ad visibility' },
    { label: 'Users and roles', route: '/admin/users', summary: 'Operator access and role assignments' },
    { label: 'API keys', route: '/admin/api-keys', summary: 'Bearer tokens for external system uploads' }
  ];

  readonly quickActions: AdminQuickAction[] = [
    { label: 'Add content', route: '/admin/content/new', description: 'Upload a photo or video.' },
    { label: 'Add iframe', route: '/admin/iframes/new', description: 'Create a pinned web view.' },
    { label: 'Add ad', route: '/admin/ads/new', description: 'Upload a client image ad.' },
    { label: 'Open remote control', route: '/admin/remote-control', description: 'Switch kiosk mode and ad visibility.' },
    { label: 'Configure display', route: '/admin/configuration', description: 'Set timing, animations, and inline ad count.' },
    { label: 'Manage users', route: '/admin/users', description: 'Create users and assign existing roles.' }
  ];
}
