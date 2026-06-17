import { CanDeactivateFn } from '@angular/router';

import { DirtyFormAware } from './dirty-form.models';

export const dirtyFormGuard: CanDeactivateFn<DirtyFormAware> = (component) => {
  if (!component?.hasUnsavedChanges()) {
    return true;
  }
  return window.confirm('Discard unsaved changes?');
};
