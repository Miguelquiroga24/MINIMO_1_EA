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

import { GRADE_VALUES, GradeValue, User } from '../../models';
import { GradeService } from '../../services/grade.service';
import { UserService } from '../../services/user.service';
import { apiErrorMessage } from '../../utils/api-error';

// Validador de grupo: quien vota y a quien no pueden ser la misma persona (la API respondería 422)
const differentUsersValidator: ValidatorFn = (control: AbstractControl): ValidationErrors | null => {
  const from = control.get('from')?.value;
  const to = control.get('to')?.value;

  return from && from === to ? { sameUser: true } : null;
};

// Formulario para cargar un voto de La Orla desde el backoffice
@Component({
  selector: 'app-grade-form',
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './grade-form.html',
  styleUrl: './grade-form.css',
})
export class GradeForm implements OnInit {
  private fb = inject(NonNullableFormBuilder);
  private gradeService = inject(GradeService);
  private userService = inject(UserService);
  private router = inject(Router);

  values = GRADE_VALUES;
  users = signal<User[]>([]);
  saving = signal(false);
  error = signal('');

  form = this.fb.group(
    {
      from: ['', Validators.required],
      to: ['', Validators.required],
      value: ['A+' as GradeValue],
    },
    { validators: differentUsersValidator },
  );

  ngOnInit(): void {
    // Solo los usuarios activos pueden votar y ser votados en la app
    this.userService
      .getUsers(1, 100, { search: '', role: 'user', active: 'true', degree: '', archived: false })
      .subscribe({
        next: (response) => this.users.set(response.users),
        error: (err: HttpErrorResponse) => this.error.set(apiErrorMessage(err)),
      });
  }

  save(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.saving.set(true);
    this.error.set('');
    this.gradeService.createGrade(this.form.getRawValue()).subscribe({
      next: () => this.router.navigate(['/grades'], { replaceUrl: true }),
      // Con un 409 la API dice que esa pareja ya tiene voto
      error: (err: HttpErrorResponse) => {
        this.error.set(apiErrorMessage(err));
        this.saving.set(false);
      },
    });
  }
}
