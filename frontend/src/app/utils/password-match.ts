import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';

// Validador de grupo: comprueba que los campos password y confirmPassword del formulario
// tienen el mismo valor. Va en el grupo (no en un campo) porque necesita ver los dos a la vez.
export const passwordMatchValidator: ValidatorFn = (
  control: AbstractControl,
): ValidationErrors | null => {
  const password = control.get('password')?.value;
  const confirmPassword = control.get('confirmPassword')?.value;

  return password === confirmPassword ? null : { passwordMismatch: true };
};
