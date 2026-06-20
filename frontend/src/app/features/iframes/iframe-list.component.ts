import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, OnInit, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTableModule } from '@angular/material/table';

import { IframeItem } from '../../core/api/iframe.api';
import { DataListComponent } from '../../shared/ui/data-list/data-list.component';
import { ConfirmDialogService } from '../../shared/ui/confirm-dialog/confirm-dialog.service';
import { IframeFacade } from './iframe.facade';

@Component({
  selector: 'app-iframe-list',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, RouterLink, MatButtonModule, MatIconModule, MatTableModule, DataListComponent],
  template: `
    <app-data-list
      title="Iframes"
      description="Preconfigured web views for remote-control pinning."
      [loading]="facade.loading()"
      [error]="facade.error()"
      [empty]="facade.empty()"
      errorTitle="Iframes unavailable"
      emptyTitle="No iframes yet"
      emptyMessage="Create an iframe URL to make it available in remote control."
      emptyActionLabel="New iframe"
      emptyActionRoute="/admin/iframes/new"
      emptyIcon="iframe"
      [primaryAction]="primaryAction"
      [refreshAction]="refreshAction"
    >
      <ng-template #dataListTable>
        <table mat-table [dataSource]="facade.iframes()" [trackBy]="trackById" class="app-table" aria-label="Iframes">
          <ng-container matColumnDef="url">
            <th mat-header-cell *matHeaderCellDef>URL</th>
            <td mat-cell *matCellDef="let iframe" [title]="iframe.url">{{ truncate(iframe.url) }}</td>
          </ng-container>
          <ng-container matColumnDef="actions">
            <th mat-header-cell *matHeaderCellDef>Actions</th>
            <td mat-cell *matCellDef="let iframe">
              <a mat-icon-button [routerLink]="['/admin/iframes', iframe.id]" aria-label="Edit iframe">
                <mat-icon>edit</mat-icon>
              </a>
              <button mat-icon-button type="button" (click)="delete(iframe)" aria-label="Delete iframe">
                <mat-icon>delete</mat-icon>
              </button>
            </td>
          </ng-container>
          <tr mat-header-row *matHeaderRowDef="displayedColumns"></tr>
          <tr mat-row *matRowDef="let row; columns: displayedColumns"></tr>
        </table>
      </ng-template>
    </app-data-list>
  `,
})
export class IframeListComponent implements OnInit {
  protected readonly facade = inject(IframeFacade);
  private readonly confirm = inject(ConfirmDialogService);
  protected readonly displayedColumns = ['url', 'actions'];
  protected readonly primaryAction = { route: '/admin/iframes/new', label: 'New iframe' };
  protected readonly refreshAction = { route: '/admin/iframes', label: 'Refresh' };

  ngOnInit(): void {
    this.facade.refresh().subscribe();
  }

  protected trackById(_index: number, item: IframeItem): string {
    return item.id;
  }

  protected truncate(url: string): string {
    return url.length > 60 ? `${url.slice(0, 57)}...` : url;
  }

  protected delete(iframe: IframeItem): void {
    this.confirm.confirm({
      title: 'Delete iframe',
      message: `Delete ${this.truncate(iframe.url)}?`,
      confirmLabel: 'Delete',
    }).afterClosed().subscribe((confirmed) => {
      if (confirmed) {
        this.facade.delete(iframe.id).subscribe();
      }
    });
  }
}
