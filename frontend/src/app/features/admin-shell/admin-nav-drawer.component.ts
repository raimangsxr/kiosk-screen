import { ChangeDetectionStrategy, Component, computed, inject, input, output, signal } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatDividerModule } from '@angular/material/divider';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatListModule } from '@angular/material/list';

import { ADMIN_COPY } from '../../shared/ui/admin/admin-copy';
import { AdminNavigationService } from './admin-navigation.service';

@Component({
  selector: 'app-admin-nav-drawer',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    RouterLink,
    RouterLinkActive,
    MatListModule,
    MatIconModule,
    MatButtonModule,
    MatDividerModule,
    MatFormFieldModule,
    MatInputModule
  ],
  template: `
    <div class="admin-nav-drawer">
      <mat-form-field appearance="outline" class="admin-nav-drawer__search" subscriptSizing="dynamic">
        <mat-label>{{ ADMIN_COPY.navSearch }}</mat-label>
        <input
          matInput
          type="search"
          [value]="searchQuery()"
          (input)="onSearch($event)"
          [attr.aria-label]="ADMIN_COPY.navSearch"
          data-testid="admin-nav-search"
        />
        @if (searchQuery()) {
          <button
            mat-icon-button
            matSuffix
            type="button"
            (click)="clearSearch()"
            [attr.aria-label]="ADMIN_COPY.navSearchClear"
          >
            <mat-icon aria-hidden="true">close</mat-icon>
          </button>
        }
      </mat-form-field>

      <div class="admin-nav-drawer__groups">
        @for (group of filteredGroups(); track group.id) {
          <mat-nav-list [attr.aria-label]="group.label">
            <div mat-subheader class="admin-nav-drawer__group-label">{{ group.label }}</div>
            @for (item of group.items; track item.route) {
              <a
                mat-list-item
                class="admin-nav-drawer__item"
                [routerLink]="item.route"
                [activated]="isRouteActive(item.route, item.exact)"
                [disableRipple]="true"
                routerLinkActive="admin-nav-drawer__item--active"
                [routerLinkActiveOptions]="{ exact: item.exact ?? false }"
                (click)="navigate.emit()"
              >
                <mat-icon matListItemIcon aria-hidden="true">{{ item.icon }}</mat-icon>
                <span matListItemTitle>{{ item.label }}</span>
                <span matListItemLine class="admin-nav-drawer__summary">{{ item.summary }}</span>
              </a>
            }
          </mat-nav-list>
        }
      </div>

      <div class="admin-nav-drawer__footer">
        <mat-divider />
        <a mat-stroked-button routerLink="/hall" class="admin-nav-drawer__footer-button" (click)="navigate.emit()">
          <mat-icon aria-hidden="true">home</mat-icon>
          {{ ADMIN_COPY.backToHall }}
        </a>
        <a mat-flat-button color="primary" routerLink="/display" class="admin-nav-drawer__footer-button" (click)="navigate.emit()">
          <mat-icon aria-hidden="true">play_circle</mat-icon>
          {{ ADMIN_COPY.enterKiosk }}
        </a>
      </div>
    </div>
  `,
  styles: [
    `
      :host {
        display: flex;
        flex-direction: column;
        height: 100%;
      }
      .admin-nav-drawer {
        display: flex;
        flex-direction: column;
        height: 100%;
        min-height: 0;
      }
      .admin-nav-drawer__search {
        width: calc(100% - 24px);
        margin: 12px 12px 4px;
      }
      .admin-nav-drawer__groups {
        flex: 1;
        overflow-y: auto;
        padding: 0 8px;
      }
      .admin-nav-drawer__group-label {
        font: var(--mat-sys-label-medium);
        letter-spacing: 0.06em;
        text-transform: uppercase;
        color: var(--mat-sys-on-surface-variant);
      }
      .admin-nav-drawer__item {
        margin: 3px 0;
        border-radius: 12px;
        min-height: var(--app-touch-target);
        --mat-list-list-item-container-shape: 12px;
        --mat-list-list-item-selected-container-color: var(--mat-sys-secondary-container);
      }
      .admin-nav-drawer__summary {
        color: var(--mat-sys-on-surface-variant);
        font: var(--mat-sys-body-small);
      }
      .admin-nav-drawer__item--active {
        color: var(--mat-sys-on-primary-container);
        box-shadow: inset 3px 0 0 var(--mat-sys-primary);
      }
      .admin-nav-drawer__item--active mat-icon {
        color: var(--mat-sys-primary);
      }
      .admin-nav-drawer__footer {
        padding: 12px 16px calc(16px + var(--admin-safe-bottom, 0px));
        display: grid;
        gap: 12px;
      }
      .admin-nav-drawer__footer-button {
        width: 100%;
        min-height: var(--app-touch-target);
      }
    `
  ]
})
export class AdminNavDrawerComponent {
  protected readonly ADMIN_COPY = ADMIN_COPY;
  private readonly navigation = inject(AdminNavigationService);

  readonly currentUrl = input.required<string>();
  readonly navigate = output<void>();

  protected readonly searchQuery = signal('');

  protected readonly filteredGroups = computed(() =>
    this.navigation.filterGroups(this.searchQuery())
  );

  protected onSearch(event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    this.searchQuery.set(value);
  }

  protected clearSearch(): void {
    this.searchQuery.set('');
  }

  protected isRouteActive(route: string, exact = false): boolean {
    const url = this.currentUrl();
    return exact ? url === route : url === route || url.startsWith(route + '/');
  }
}
