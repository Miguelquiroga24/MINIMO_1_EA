import { HttpErrorResponse } from '@angular/common/http';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { EMPTY, Observable, Subject, catchError, finalize, switchMap, tap } from 'rxjs';

import { DEGREES, User, UserFilters } from '../../models';
import { AuthService } from '../../services/auth.service';
import { UserService } from '../../services/user.service';
import { apiErrorMessage } from '../../utils/api-error';
import { Avatar } from '../avatar/avatar';
import { ConfirmModal } from '../confirm-modal/confirm-modal';
import { Pagination } from '../pagination/pagination';

// 10 usuarios por página: se los pedimos así a la API (?limit=10)
export const PAGE_SIZE = 10;

// Las acciones que piden confirmación con el modal
type UserAction = 'archive' | 'delete';

// Lista de usuarios del backoffice. La paginación y los filtros los hace la API: cada vez que
// cambia la página o un filtro se pide la página que toca, como hacía la lista de libros del seminario
@Component({
  selector: 'app-users-list',
  imports: [FormsModule, RouterLink, Avatar, ConfirmModal, Pagination],
  templateUrl: './users-list.html',
  styleUrl: './users-list.css',
})
export class UsersList implements OnInit {
  private userService = inject(UserService);
  private auth = inject(AuthService);
  private pageRequests = new Subject<number>();

  // Las opciones del filtro de titulación
  degrees = DEGREES;

  users = signal<User[]>([]);
  total = signal(0);
  totalPages = signal(1);
  page = signal(1);
  loading = signal(true);
  error = signal('');

  // Los filtros, unidos a los campos de la barra de herramientas con [(ngModel)]
  search = signal('');
  role = signal<UserFilters['role']>('');
  active = signal<UserFilters['active']>('');
  degree = signal('');
  archived = signal(false);

  // El usuario y la acción que espera confirmación en el modal (null si el modal está cerrado)
  pending = signal<{ user: User; action: UserAction } | null>(null);

  // Textos del modal según la acción. Eliminar para siempre avisa de que no se puede deshacer
  modalTitle = computed(() =>
    this.pending()?.action === 'delete'
      ? '¿Estás seguro de que quieres eliminar este usuario?'
      : 'Archivar usuario',
  );

  modalMessage = computed(() => {
    const pending = this.pending();
    if (!pending) {
      return '';
    }

    return pending.action === 'delete'
      ? `Se borrará ${pending.user.name} de la base de datos para siempre. Esto no se puede deshacer.`
      : `${pending.user.name} no podrá iniciar sesión. Podrás restaurarlo desde "Ver archivados".`;
  });

  modalConfirmText = computed(() =>
    this.pending()?.action === 'delete' ? 'Eliminar para siempre' : 'Archivar',
  );

  constructor() {
    // switchMap: si llega otra petición antes de que responda la anterior (por ejemplo, mientras
    // se escribe en el buscador), se cancela la vieja y solo cuenta la última
    this.pageRequests
      .pipe(
        switchMap((page) => {
          this.loading.set(true);
          this.error.set('');
          return this.userService.getUsers(page, PAGE_SIZE, this.filters()).pipe(
            tap((response) => {
              this.users.set(response.users);
              this.total.set(response.total);
              this.totalPages.set(Math.max(response.pages, 1));
              this.page.set(response.page);
            }),
            catchError((err: HttpErrorResponse) => {
              this.error.set(apiErrorMessage(err));
              return EMPTY;
            }),
            finalize(() => this.loading.set(false)),
          );
        }),
        takeUntilDestroyed(),
      )
      .subscribe();
  }

  ngOnInit(): void {
    this.loadPage(1);
  }

  // Al cambiar un filtro se vuelve a la página 1: la página 3 de antes puede no existir con el filtro nuevo
  loadPage(page: number): void {
    this.page.set(page);
    this.pageRequests.next(page);
  }

  // El admin con sesión no puede archivarse ni eliminarse a sí mismo: en su fila no salen esos botones
  isMe(user: User): boolean {
    return user._id === this.auth.user()?._id;
  }

  // Archivar y eliminar abren el modal; la acción se hace al confirmar
  askArchive(user: User): void {
    this.pending.set({ user, action: 'archive' });
  }

  askDelete(user: User): void {
    this.pending.set({ user, action: 'delete' });
  }

  cancelAction(): void {
    this.pending.set(null);
  }

  confirmAction(): void {
    const pending = this.pending();
    if (!pending) {
      return;
    }

    this.pending.set(null);
    const request =
      pending.action === 'delete'
        ? this.userService.deleteUser(pending.user._id)
        : this.userService.archiveUser(pending.user._id);
    this.run(request);
  }

  // Restaurar no pide confirmación: no se pierde nada y se puede volver a archivar
  restore(user: User): void {
    this.run(this.userService.restoreUser(user._id));
  }

  // Después de archivar, restaurar o eliminar, el usuario desaparece de la lista que se está viendo.
  // Recargo la página actual; si era el último de la página, la anterior (como hacía el seminario)
  private run(request: Observable<unknown>): void {
    this.error.set('');
    request.subscribe({
      next: () => {
        const isLastOnPage = this.users().length === 1 && this.page() > 1;
        this.loadPage(isLastOnPage ? this.page() - 1 : this.page());
      },
      // Con un 409 o un 403 la API manda el motivo en message
      error: (err: HttpErrorResponse) => this.error.set(apiErrorMessage(err)),
    });
  }

  // Los filtros juntos, tal como los necesita UserService
  private filters(): UserFilters {
    return {
      search: this.search(),
      role: this.role(),
      active: this.active(),
      degree: this.degree(),
      archived: this.archived(),
    };
  }
}
