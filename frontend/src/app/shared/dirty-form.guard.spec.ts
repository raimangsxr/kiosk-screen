import { TestBed } from '@angular/core/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { MatDialog } from '@angular/material/dialog';
import { of } from 'rxjs';

import { dirtyFormGuard } from './dirty-form.guard';

class MatDialogStub {
  open() {
    return { afterClosed: () => of(true) };
  }
}

class MatDialogCancelStub {
  open() {
    return { afterClosed: () => of(false) };
  }
}

describe('dirtyFormGuard', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [NoopAnimationsModule],
      providers: [{ provide: MatDialog, useClass: MatDialogStub }]
    });
  });

  it('allows clean forms to deactivate', () => {
    const result = TestBed.runInInjectionContext(() =>
      dirtyFormGuard({ hasUnsavedChanges: () => false }, {} as never, {} as never, {} as never)
    );
    expect(result).toBeTrue();
  });

  it('returns true when the user confirms discard', async () => {
    const observable = TestBed.runInInjectionContext(() =>
      dirtyFormGuard({ hasUnsavedChanges: () => true }, {} as never, {} as never, {} as never)
    ) as ReturnType<typeof dirtyFormGuard>;

    const value = await new Promise<boolean | undefined>((resolve) => {
      (observable as { subscribe: (cb: (v: boolean | undefined) => void) => void }).subscribe(resolve);
    });
    expect(value).toBeTrue();
  });

  it('returns false when the user cancels discard', async () => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      imports: [NoopAnimationsModule],
      providers: [{ provide: MatDialog, useClass: MatDialogCancelStub }]
    });

    const observable = TestBed.runInInjectionContext(() =>
      dirtyFormGuard({ hasUnsavedChanges: () => true }, {} as never, {} as never, {} as never)
    ) as ReturnType<typeof dirtyFormGuard>;

    const value = await new Promise<boolean | undefined>((resolve) => {
      (observable as { subscribe: (cb: (v: boolean | undefined) => void) => void }).subscribe(resolve);
    });
    expect(value).toBeFalse();
  });
});
