import { HttpErrorResponse } from '@angular/common/http';
import { Component, inject, input, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';

import { AuthService } from '../../services/auth.service';
import { apiErrorMessage } from '../../utils/api-error';

@Component({
  selector: 'app-login',
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './login.html',
  styleUrl: './login.css',
})
export class Login {
  private fb = inject(NonNullableFormBuilder);
  private auth = inject(AuthService);
  private router = inject(Router);

  // Vienen de la URL (?returnUrl=/users o ?registered=true) gracias a withComponentInputBinding.
  // returnUrl lo pone authGuard: es la página a la que se quería ir antes de iniciar sesión
  returnUrl = input<string>();
  // registered lo pone la pantalla de registro para enseñar el aviso de cuenta creada
  registered = input<string>();

  saving = signal(false);
  error = signal('');

  form = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', Validators.required],
  });

  login(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.saving.set(true);
    this.error.set('');
    this.auth.login(this.form.getRawValue()).subscribe({
      // Solo acepto rutas de esta app (empiezan por /) para no mandar a nadie a otra web.
      // Sin returnUrl, todos (admin y user) entran por los Dates
      next: () => {
        const returnUrl = this.returnUrl();
        this.router.navigateByUrl(returnUrl?.startsWith('/') ? returnUrl : '/dates', {
          replaceUrl: true,
        });
      },
      // Con un 401 la API manda "Email o contraseña incorrectos"
      error: (err: HttpErrorResponse) => {
        this.error.set(apiErrorMessage(err));
        this.saving.set(false);
      },
    });
  }
}
