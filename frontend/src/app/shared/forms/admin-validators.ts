import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';

export function positiveInteger(messageKey = 'positiveInteger'): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    if (control.value === null || control.value === undefined || control.value === '') {
      return null;
    }
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

export const MIN_PASSWORD_LENGTH = 8;

export function minPasswordLength(messageKey = 'minPasswordLength'): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    if (control.value === null || control.value === undefined || control.value === '') {
      return null;
    }
    if (typeof control.value !== 'string' || control.value.length < MIN_PASSWORD_LENGTH) {
      return { [messageKey]: true };
    }
    return null;
  };
}
