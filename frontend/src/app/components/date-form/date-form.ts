import { HttpErrorResponse } from '@angular/common/http';
import { Component, OnInit, inject, signal } from '@angular/core';
import {
  AbstractControl,
  NonNullableFormBuilder,
  ReactiveFormsModule,
  ValidationErrors,
  ValidatorFn,
  Validators,
} from '@angular/forms';
import { Router, RouterLink } from '@angular/router';

import { DirectoryUser } from '../../models';
import { AuthService } from '../../services/auth.service';
import { DateService } from '../../services/date.service';
import { UserService } from '../../services/user.service';
import { apiErrorMessage } from '../../utils/api-error';

// Validador de grupo: un Date es entre dos personas distintas
const differentUsersValidator: ValidatorFn = (control: AbstractControl): ValidationErrors | null => {
  const userA = control.get('userA')?.value;
  const userB = control.get('userB')?.value;

  return userA && userA === userB ? { sameUser: true } : null;
};

// Abrir un Date a mano. El admin elige a los dos usuarios; un usuario normal elige con quién
// (el otro es él). La API sortea quién escribe primero y pone la caducidad
@Component({
  selector: 'app-date-form',
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './date-form.html',
  styleUrl: './date-form.css',
})
export class DateForm implements OnInit {
  private fb = inject(NonNullableFormBuilder);
  private dateService = inject(DateService);
  private userService = inject(UserService);
  private auth = inject(AuthService);
  private router = inject(Router);

  isAdmin = this.auth.isAdmin;
  users = signal<DirectoryUser[]>([]);
  saving = signal(false);
  error = signal('');

  // Para un usuario normal, userA es él mismo y no se enseña
  form = this.fb.group(
    {
      userA: [this.auth.user()?._id ?? '', Validators.required],
      userB: ['', Validators.required],
    },
    { validators: differentUsersValidator },
  );

  ngOnInit(): void {
    if (this.isAdmin()) {
      // El admin puede elegir a cualquier usuario activo
      this.form.controls.userA.setValue('');
      this.userService
        .getUsers(1, 100, { search: '', role: 'user', active: 'true', degree: '', archived: false })
        .subscribe({
          next: (response) => this.users.set(response.users),
          error: (err: HttpErrorResponse) => this.error.set(apiErrorMessage(err)),
        });
    } else {
      // Un usuario normal no puede llamar a GET /users (es del backoffice): usa /users/directory
      this.userService.getDirectory().subscribe({
        next: (response) => this.users.set(response.users),
        error: (err: HttpErrorResponse) => this.error.set(apiErrorMessage(err)),
      });
    }
  }

  save(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const { userA, userB } = this.form.getRawValue();

    this.saving.set(true);
    this.error.set('');
    this.dateService.createDate({ users: [userA, userB] }).subscribe({
      next: () => this.router.navigate(['/dates'], { replaceUrl: true }),
      // Con un 409 la API dice que ya hay un Date entre los dos
      error: (err: HttpErrorResponse) => {
        this.error.set(apiErrorMessage(err));
        this.saving.set(false);
      },
    });
  }
}
