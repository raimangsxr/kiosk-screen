export interface DirtyFormAware {
  hasUnsavedChanges(): boolean;
}

export interface DirtyFormState<T> {
  initialValues: T;
  currentValues: T;
  isDirty: boolean;
  isSaving: boolean;
  lastResult: string;
}
