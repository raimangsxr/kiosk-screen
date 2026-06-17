import { dirtyFormGuard } from './dirty-form.guard';

describe('dirtyFormGuard', () => {
  it('allows clean forms to deactivate', () => {
    expect(dirtyFormGuard({ hasUnsavedChanges: () => false }, {} as never, {} as never, {} as never)).toBeTrue();
  });

  it('asks before discarding dirty forms', () => {
    spyOn(window, 'confirm').and.returnValue(true);

    expect(dirtyFormGuard({ hasUnsavedChanges: () => true }, {} as never, {} as never, {} as never)).toBeTrue();
    expect(window.confirm).toHaveBeenCalled();
  });
});
