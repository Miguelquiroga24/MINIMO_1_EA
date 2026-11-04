import { HttpErrorResponse } from '@angular/common/http';
import { Component, inject, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';

import { AuthService } from '../../services/auth.service';
import { apiErrorMessage } from '../../utils/api-error';
import { passwordMatchValidator } from '../../utils/password-match';

@Component({
  selector: 'app-register',
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './register.html',
  styleUrl: './register.css',
})
export class Register {
  private fb = inject(NonNullableFormBuilder);
  private auth = inject(AuthService);
  private router = inject(Router);

  saving = signal(false);
  error = signal('');

  // Las mismas reglas que valida el backend, así casi todos los errores se ven antes de enviar
  form = this.fb.group(
    {
      name: ['', [Validators.required, Validators.pattern(/\S/)]],
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(8)]],
      confirmPassword: ['', Validators.required],
    },
    { validators: passwordMatchValidator },
  );

  register(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    // confirmPassword solo sirve para el formulario: a la API le mando nombre, email y contraseña
    const { name, email, password } = this.form.getRawValue();

    this.saving.set(true);
    this.error.set('');
    this.auth.register({ name, email, password }).subscribe({
      // Según el contrato, el registro no da token: llevo al login con un aviso de cuenta creada
      next: () => this.router.navigate(['/login'], { queryParams: { registered: true } }),
      // Con un 409 la API manda "email ya existe"
      error: (err: HttpErrorResponse) => {
        this.error.set(apiErrorMessage(err));
        this.saving.set(false);
      },
    });
  }
}
