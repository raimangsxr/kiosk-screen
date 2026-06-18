import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { TestBed } from '@angular/core/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';

import { ConfirmDialogComponent, ConfirmDialogData } from './confirm-dialog.component';
import { ConfirmDialogService } from './confirm-dialog.service';

describe('ConfirmDialogComponent', () => {
  const data: ConfirmDialogData = {
    title: 'Delete content',
    message: 'Are you sure you want to delete this item?',
    confirmLabel: 'Delete',
    cancelLabel: 'Cancel',
    destructive: true
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [ConfirmDialogComponent, NoopAnimationsModule],
      providers: [
        { provide: MAT_DIALOG_DATA, useValue: data },
        { provide: MatDialogRef, useValue: { close: () => undefined } }
      ]
    });
  });

  it('renders the data values', () => {
    const fixture = TestBed.createComponent(ConfirmDialogComponent);
    fixture.detectChanges();

    const text = fixture.nativeElement.textContent;
    expect(text).toContain('Delete content');
    expect(text).toContain('Are you sure');
    expect(text).toContain('Delete');
    expect(text).toContain('Cancel');
  });
});

describe('ConfirmDialogService', () => {
  let service: ConfirmDialogService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [NoopAnimationsModule],
      providers: [
        ConfirmDialogService,
        {
          provide: MatDialogRef,
          useValue: { afterClosed: () => ({ subscribe: () => undefined }), close: () => undefined }
        }
      ]
    });
    service = TestBed.inject(ConfirmDialogService);
  });

  it('is provided in root', () => {
    expect(service).toBeTruthy();
  });
});
