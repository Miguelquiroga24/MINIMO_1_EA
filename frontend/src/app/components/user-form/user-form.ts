import { HttpErrorResponse } from '@angular/common/http';
import { Component, OnInit, computed, inject, input, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';

import { CreateUser, DEGREES, User, UserRole } from '../../models';
import { AuthService } from '../../services/auth.service';
import { UserService } from '../../services/user.service';
import { apiErrorMessage } from '../../utils/api-error';
import { imageToDataUrl } from '../../utils/image-to-data-url';
import { passwordMatchValidator } from '../../utils/password-match';
import { removeEmpty } from '../../utils/remove-empty';
import { Avatar } from '../avatar/avatar';

// Crear y editar usuarios desde el backoffice. Es como el registro, pero el admin elige además
// el rol, si el usuario está activo y los datos de su perfil (con la foto)
@Component({
  selector: 'app-user-form',
  imports: [ReactiveFormsModule, RouterLink, Avatar],
  templateUrl: './user-form.html',
  styleUrl: './user-form.css',
})
export class UserForm implements OnInit {
  private fb = inject(NonNullableFormBuilder);
  private userService = inject(UserService);
  private auth = inject(AuthService);
  private router = inject(Router);

  // Viene del :id de la ruta. En users/new no hay id y el formulario sirve para crear
  id = input<string>();

  degrees = DEGREES;

  loading = signal(false);
  loadFailed = signal(false);
  saving = signal(false);
  error = signal('');

  // La foto va aparte del formulario: no se escribe, se elige un fichero.
  // photoChanged dice si hay que enviarla (también vacía, para quitarla)
  photo = signal('');
  photoChanged = signal(false);

  // El admin editándose a sí mismo: no puede cambiarse el rol ni desactivarse (la API respondería 403)
  isOwnUser = computed(() => !!this.id() && this.id() === this.auth.user()?._id);

  // Reglas parecidas a las que valida el backend, así casi todos los errores se ven antes de enviar.
  // La contraseña solo se pide al crear (ver ngOnInit)
  form = this.fb.group(
    {
      name: ['', [Validators.required, Validators.pattern(/\S/)]],
      email: ['', [Validators.required, Validators.email]],
      password: [''],
      confirmPassword: [''],
      role: ['user' as UserRole],
      active: [true],
      birthDate: [''],
      degree: [''],
      lookingFor: ['', Validators.maxLength(100)],
      bio: ['', Validators.maxLength(500)],
    },
    { validators: passwordMatchValidator },
  );

  ngOnInit(): void {
    const id = this.id();

    // Al crear, la contraseña es obligatoria
    if (!id) {
      this.form.controls.password.setValidators([Validators.required, Validators.minLength(8)]);
      this.form.controls.confirmPassword.setValidators(Validators.required);
      return;
    }

    // Con mi propio usuario, el rol y el activo no se pueden tocar
    if (this.isOwnUser()) {
      this.form.controls.role.disable();
      this.form.controls.active.disable();
    }

    this.loading.set(true);
    this.userService.getUser(id).subscribe({
      next: (response) => {
        this.fillForm(response.user);
        this.loading.set(false);
      },
      error: (err: HttpErrorResponse) => {
        this.error.set(apiErrorMessage(err));
        this.loadFailed.set(true);
        this.loading.set(false);
      },
    });
  }

  // Cuando se elige un fichero, se reduce y se enseña en el círculo antes de guardar
  async onPhotoSelected(event: Event): Promise<void> {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) {
      return;
    }

    try {
      this.photo.set(await imageToDataUrl(file));
      this.photoChanged.set(true);
    } catch {
      this.error.set('No se ha podido leer la imagen. Prueba con un PNG o un JPG.');
    }
  }

  removePhoto(): void {
    this.photo.set('');
    this.photoChanged.set(true);
  }

  save(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const id = this.id();
    const formValue = this.form.getRawValue();

    // confirmPassword solo sirve para el formulario. Los campos vacíos no se envían (removeEmpty)
    const user = removeEmpty({
      name: formValue.name,
      email: formValue.email,
      password: id ? '' : formValue.password,
      birthDate: formValue.birthDate,
      degree: formValue.degree,
      lookingFor: formValue.lookingFor,
      bio: formValue.bio,
    }) as CreateUser;

    // Con mi propio usuario no envío el rol ni el activo
    if (!this.isOwnUser()) {
      user.role = formValue.role;
      user.active = formValue.active;
    }

    // La foto solo se envía si ha cambiado. Vacía ('') quiere decir "quitar la foto"
    if (this.photoChanged() && (id || this.photo())) {
      user.photo = this.photo();
    }

    const request = id ? this.userService.updateUser(id, user) : this.userService.createUser(user);

    this.saving.set(true);
    this.error.set('');
    request.subscribe({
      // replaceUrl: así el botón Atrás no vuelve a este formulario con los datos de antes de guardar
      next: () => this.router.navigate(['/users'], { replaceUrl: true }),
      // Con un 409 la API manda "email ya existe"
      error: (err: HttpErrorResponse) => {
        this.error.set(apiErrorMessage(err));
        this.saving.set(false);
      },
    });
  }

  private fillForm(user: User): void {
    this.form.patchValue({
      name: user.name,
      email: user.email,
      role: user.role,
      active: user.active ?? true,
      birthDate: user.birthDate?.slice(0, 10) ?? '',
      degree: user.degree ?? '',
      lookingFor: user.lookingFor ?? '',
      bio: user.bio ?? '',
    });
    this.photo.set(user.photo ?? '');
  }
}
