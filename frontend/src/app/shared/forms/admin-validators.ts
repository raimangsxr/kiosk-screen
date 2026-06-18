import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';

export function positiveInteger(messageKey = 'positiveInteger'): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const value = Number(control.value);
    if (!Number.isInteger(value) || value <= 0) {
      return { [messageKey]: true };
    }
    return null;
  };
}

export function nonBlankString(messageKey = 'required'): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    if (typeof control.value !== 'string' || control.value.trim().length === 0) {
      return { [messageKey]: true };
    }
    return null;
  };
}
