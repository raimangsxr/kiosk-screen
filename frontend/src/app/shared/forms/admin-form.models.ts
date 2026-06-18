import { AbstractControl, ValidationErrors } from '@angular/forms';

export interface AdminFormValidationMessage {
  readonly controlName: string;
  readonly error: string;
  readonly message: string;
}

export type AdminValidator = (control: AbstractControl) => ValidationErrors | null;
