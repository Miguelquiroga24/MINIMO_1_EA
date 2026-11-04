import { DatePipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { EMPTY, Subject, catchError, finalize, switchMap, tap } from 'rxjs';

import { Grade, GradeFilters, User } from '../../models';
import { GradeService } from '../../services/grade.service';
import { UserService } from '../../services/user.service';
import { apiErrorMessage } from '../../utils/api-error';
import { Avatar } from '../avatar/avatar';
import { ConfirmModal } from '../confirm-modal/confirm-modal';
import { Pagination } from '../pagination/pagination';

// 10 votos por página, igual que los usuarios
const PAGE_SIZE = 10;

// La Orla en el backoffice: la lista de votos (quién vota a quién y con qué nota), con filtros,
// cambiar la nota y eliminar. Mismo patrón que la lista de usuarios
@Component({
  selector: 'app-grades-list',
  imports: [FormsModule, RouterLink, DatePipe, Avatar, ConfirmModal, Pagination],
  templateUrl: './grades-list.html',
  styleUrl: './grades-list.css',
})
export class GradesList implements OnInit {
  private gradeService = inject(GradeService);
  private userService = inject(UserService);
  private pageRequests = new Subject<number>();

  grades = signal<Grade[]>([]);
  total = signal(0);
  totalPages = signal(1);
  page = signal(1);
  loading = signal(true);
  error = signal('');

  // Filtros
  value = signal<GradeFilters['value']>('');
  user = signal('');

  // Los usuarios para el filtro "de un usuario"
  users = signal<User[]>([]);

  // El voto que espera confirmación para eliminarlo
  gradeToDelete = signal<Grade | null>(null);

  deleteMessage = computed(() => {
    const grade = this.gradeToDelete();
    return grade ? `Se borra el ${grade.value} de ${grade.from.name} a ${grade.to.name}.` : '';
  });

  constructor() {
    this.pageRequests
      .pipe(
        switchMap((page) => {
          this.loading.set(true);
          this.error.set('');
          return this.gradeService
            .getGrades(page, PAGE_SIZE, { value: this.value(), user: this.user() })
            .pipe(
              tap((response) => {
                this.grades.set(response.grades);
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

    // Para el filtro pido los usuarios no archivados. Con 100 (el máximo de la API) hay de sobra
    // para el backoffice de clase; con muchos más usuarios haría falta un buscador
    this.userService
      .getUsers(1, 100, { search: '', role: '', active: '', degree: '', archived: false })
      .subscribe({ next: (response) => this.users.set(response.users) });
  }

  loadPage(page: number): void {
    this.page.set(page);
    this.pageRequests.next(page);
  }

  // Cambiar la nota: de A+ a F o al revés. No pide confirmación porque se puede volver a cambiar
  toggleValue(grade: Grade): void {
    this.error.set('');
    this.gradeService.updateGrade(grade._id, grade.value === 'A+' ? 'F' : 'A+').subscribe({
      next: () => this.loadPage(this.page()),
      error: (err: HttpErrorResponse) => this.error.set(apiErrorMessage(err)),
    });
  }

  askDelete(grade: Grade): void {
    this.gradeToDelete.set(grade);
  }

  cancelDelete(): void {
    this.gradeToDelete.set(null);
  }

  confirmDelete(): void {
    const grade = this.gradeToDelete();
    if (!grade) {
      return;
    }

    this.gradeToDelete.set(null);
    this.error.set('');
    this.gradeService.deleteGrade(grade._id).subscribe({
      // Si era el último de la página, a la anterior
      next: () => {
        const isLastOnPage = this.grades().length === 1 && this.page() > 1;
        this.loadPage(isLastOnPage ? this.page() - 1 : this.page());
      },
      error: (err: HttpErrorResponse) => this.error.set(apiErrorMessage(err)),
    });
  }
}
