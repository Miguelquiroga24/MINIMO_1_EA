import { DatePipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
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
  imports: [FormsModule, RouterLink, DatePipe, Avatar, ConfirmModal, Pagination],
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
    this.run(this.dateService.deleteDate(date._id));
  }

  // Después de cualquier cambio se recarga la página (un Date que cambia de bandeja sale de la pestaña)
  private run(request: Observable<unknown>): void {
    this.error.set('');
    request.subscribe({
      next: () => {
        const isLastOnPage = this.dates().length === 1 && this.page() > 1;
        this.loadPage(isLastOnPage ? this.page() - 1 : this.page());
      },
      // Con un 409 la API dice que la prórroga ya se ha usado
      error: (err: HttpErrorResponse) => this.error.set(apiErrorMessage(err)),
    });
  }
}
