import { DatePipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, OnInit, computed, inject, input, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { EMPTY, Observable, Subject, catchError, finalize, switchMap, tap } from 'rxjs';

import { DATE_STATUS_LABELS, DateFilters, DateStatus, GradeUser, StudateDate, User } from '../../models';
import { AuthService } from '../../services/auth.service';
import { DateService } from '../../services/date.service';
import { UserService } from '../../services/user.service';
import { apiErrorMessage } from '../../utils/api-error';
import { Avatar } from '../avatar/avatar';
import { ConfirmModal } from '../confirm-modal/confirm-modal';
import { Pagination } from '../pagination/pagination';
import { ReviewStats } from '../review-stats/review-stats';
import { ReviewsList } from '../reviews-list/reviews-list';

const PAGE_SIZE = 10;

// Las bandejas, en el orden de las pestañas. '' es "Todos"
const TABS: { status: DateFilters['status']; label: string }[] = [
  { status: 'pending', label: 'Pendientes' },
  { status: 'ongoing', label: 'En curso' },
  { status: 'closed', label: 'Cerrados' },
  { status: '', label: 'Todos' },
];

// Los Dates: la pantalla de entrada para todos. El admin ve todos los Dates de la app (y puede
// filtrar por usuario y eliminar); un usuario normal ve solo los suyos. Quién ve qué lo decide la API
@Component({
  selector: 'app-dates-list',
  imports: [FormsModule, RouterLink, DatePipe, Avatar, ConfirmModal, Pagination, ReviewStats, ReviewsList],
  templateUrl: './dates-list.html',
  styleUrl: './dates-list.css',
})
export class DatesList implements OnInit {
  private dateService = inject(DateService);
  private userService = inject(UserService);
  private auth = inject(AuthService);
  private pageRequests = new Subject<number>();

  tabs = TABS;
  statusLabels = DATE_STATUS_LABELS;
  statuses = Object.keys(DATE_STATUS_LABELS) as DateStatus[];

  isAdmin = this.auth.isAdmin;
  myId = computed(() => this.auth.user()?._id);

  dates = signal<StudateDate[]>([]);
  total = signal(0);
  totalPages = signal(1);
  page = signal(1);
  loading = signal(true);
  error = signal('');

  // Se entra en la bandeja de Pendientes
  status = signal<DateFilters['status']>('pending');
  user = signal('');

  // Para el filtro por usuario (solo admin)
  users = signal<User[]>([]);

  dateToDelete = signal<StudateDate | null>(null);

  // ?reviews=<id> en la URL: al volver del formulario de valoración se abren las de ese Date
  reviews = input<string>();

  // El Date del que se enseñan las valoraciones (null: ninguno)
  selected = signal<StudateDate | null>(null);

  // Al borrar una valoración se incrementa, y el resumen se vuelve a pedir
  reviewsVersion = signal(0);

  deleteMessage = computed(() => {
    const date = this.dateToDelete();
    return date ? `Se borra el Date entre ${date.users.map((user) => user.name).join(' y ')}.` : '';
  });

  constructor() {
    this.pageRequests
      .pipe(
        switchMap((page) => {
          this.loading.set(true);
          this.error.set('');
          return this.dateService.getDates(page, PAGE_SIZE, { status: this.status(), user: this.user() }).pipe(
            tap((response) => {
              this.dates.set(response.dates);
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

    const reviewsOf = this.reviews();
    if (reviewsOf) {
      this.dateService.getDate(reviewsOf).subscribe({
        next: (response) => this.selected.set(response.date),
        error: (err: HttpErrorResponse) => this.error.set(apiErrorMessage(err)),
      });
    }

    if (this.isAdmin()) {
      this.userService
        .getUsers(1, 100, { search: '', role: 'user', active: '', degree: '', archived: false })
        .subscribe({ next: (response) => this.users.set(response.users) });
    }
  }

  loadPage(page: number): void {
    this.page.set(page);
    this.pageRequests.next(page);
  }

  selectTab(status: DateFilters['status']): void {
    this.status.set(status);
    this.loadPage(1);
  }

  // Para un usuario normal: la otra persona del Date
  other(date: StudateDate): GradeUser {
    return date.users.find((user) => user._id !== this.myId()) ?? date.users[0];
  }

  // A quién le toca escribir primero, como se enseña al usuario normal
  firstTurnName(date: StudateDate): string {
    return date.firstTurn === this.myId() ? 'Tú' : this.other(date).name.split(' ')[0];
  }

  isExpired(date: StudateDate): boolean {
    return new Date(date.expiresAt).getTime() < Date.now();
  }

  // Abre o cierra las valoraciones de un Date (debajo de la tabla)
  toggleReviews(date: StudateDate): void {
    this.selected.set(this.selected()?._id === date._id ? null : date);
  }

  changeStatus(date: StudateDate, status: DateStatus): void {
    this.run(this.dateService.updateStatus(date._id, status));
  }

  extend(date: StudateDate): void {
    this.run(this.dateService.extendDate(date._id));
  }

  askDelete(date: StudateDate): void {
    this.dateToDelete.set(date);
  }

  cancelDelete(): void {
    this.dateToDelete.set(null);
  }

  confirmDelete(): void {
    const date = this.dateToDelete();
    if (!date) {
      return;
    }

    this.dateToDelete.set(null);

    // Si tenía las valoraciones abiertas, se cierran (la API también borra sus valoraciones)
    if (this.selected()?._id === date._id) {
      this.selected.set(null);
    }

    this.run(this.dateService.deleteDate(date._id));
  }

  // Después de cualquier cambio se recarga la página (un Date que cambia de bandeja sale de la pestaña)
  private run(request: Observable<unknown>): void {
    this.error.set('');
    request.subscribe({
      next: (response) => {
        // Si ha cambiado el Date que tiene las valoraciones abiertas (su estado o la prórroga), las
        // valoraciones se quedan con el Date nuevo: así el botón de valorar sabe si sigue pendiente
        const updated = (response as { date?: StudateDate } | null)?.date;
        if (updated && updated._id === this.selected()?._id) {
          this.selected.set(updated);
        }

        const isLastOnPage = this.dates().length === 1 && this.page() > 1;
        this.loadPage(isLastOnPage ? this.page() - 1 : this.page());
      },
      // Con un 409 la API dice que la prórroga ya se ha usado
      error: (err: HttpErrorResponse) => this.error.set(apiErrorMessage(err)),
    });
  }
}
