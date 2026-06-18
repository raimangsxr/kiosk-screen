import { inject } from '@angular/core';
import { CanDeactivateFn, UrlTree } from '@angular/router';
import { Observable, of } from 'rxjs';
import { map } from 'rxjs/operators';

import { ConfirmDialogService } from './ui/confirm-dialog/confirm-dialog.service';
import { DirtyFormAware } from './dirty-form.models';

type GuardResult = boolean | UrlTree | Observable<boolean | UrlTree>;

export const dirtyFormGuard: CanDeactivateFn<DirtyFormAware> = (component): GuardResult => {
  if (!component?.hasUnsavedChanges()) {
    return true;
  }
  const dialog = inject(ConfirmDialogService);
  const ref = dialog.open({
    title: 'Discard unsaved changes?',
    message: 'You have unsaved changes on this form. Leaving will discard them.',
    confirmLabel: 'Discard',
    cancelLabel: 'Keep editing',
    destructive: true
  });
  return ref.afterClosed().pipe(map((value) => value === true));
};
