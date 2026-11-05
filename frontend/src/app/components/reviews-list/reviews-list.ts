import { DatePipe, DecimalPipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, computed, effect, inject, input, output, signal, untracked } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { EMPTY, Subject, catchError, finalize, switchMap, tap } from 'rxjs';

import { REVIEW_CRITERIA_LABELS, Review, ReviewFilters, StudateDate } from '../../models';
import { AuthService } from '../../services/auth.service';
import { ReviewService } from '../../services/review.service';
import { apiErrorMessage } from '../../utils/api-error';
import { Avatar } from '../avatar/avatar';
import { ConfirmModal } from '../confirm-modal/confirm-modal';
import { Pagination } from '../pagination/pagination';

// 5 valoraciones por página (un Date tiene como mucho dos, pero el admin puede quitar el filtro de Date)
const PAGE_SIZE = 5;

// El listado de valoraciones de un Date, dentro de la vista de Dates. Paginación y búsqueda en el
// servidor, con el mismo patrón que las demás listas (Subject + switchMap)
@Component({
  selector: 'app-reviews-list',
  imports: [FormsModule, RouterLink, DatePipe, DecimalPipe, Avatar, ConfirmModal, Pagination],
  templateUrl: './reviews-list.html',
  styleUrl: './reviews-list.css',
})
export class ReviewsList {
  private reviewService = inject(ReviewService);
  private auth = inject(AuthService);
  private pageRequests = new Subject<number>();

  // El Date seleccionado en la vista de Dates
  date = input.required<StudateDate>();

  // Aviso al padre de que se ha borrado una valoración (para refrescar el resumen)
  changed = output<void>();

  labels = REVIEW_CRITERIA_LABELS;
  scoreOptions = [1, 2, 3, 4, 5];

  reviews = signal<Review[]>([]);
  total = signal(0);
  totalPages = signal(1);
  page = signal(1);
  loading = signal(true);
  error = signal('');

  // Los filtros: texto del comentario y media mínima. El del Date va siempre (el seleccionado)
  search = signal('');
  minScore = signal<ReviewFilters['minScore']>('');

  reviewToDelete = signal<Review | null>(null);

  isAdmin = this.auth.isAdmin;
  private myId = computed(() => this.auth.user()?._id);

  // Valorar: solo uno de los dos usuarios del Date (el admin no), y si el Date ya no está pendiente.
  // Si ya la ha valorado no sale el botón (la API respondería 409)
  canReview = computed(() => {
    const date = this.date();
    const me = this.myId();
    const isParticipant = date.users.some((user) => user._id === me);
    const alreadyReviewed = this.reviews().some((review) => review.author._id === me);

    return !this.isAdmin() && isParticipant && date.status !== 'pending' && !alreadyReviewed;
  });

  deleteMessage = computed(() => {
    const review = this.reviewToDelete();
    return review ? `Se borra la valoración de ${review.author.name}. No se puede deshacer.` : '';
  });

  constructor() {
    this.pageRequests
      .pipe(
        switchMap((page) => {
          this.loading.set(true);
          this.error.set('');
          return this.reviewService.getReviews(page, PAGE_SIZE, this.filters()).pipe(
            tap((response) => {
              this.reviews.set(response.reviews);
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

    // Al elegir otro Date se limpian los filtros y se vuelve a la página 1
    effect(() => {
      this.date();
      untracked(() => {
        this.search.set('');
        this.minScore.set('');
        this.loadPage(1);
      });
    });
  }

  loadPage(page: number): void {
    this.page.set(page);
    this.pageRequests.next(page);
  }

  // Editar y eliminar: solo el autor o un admin. Ocultarlo es comodidad: la API responde 403 igualmente
  canManage(review: Review): boolean {
    return this.isAdmin() || review.author._id === this.myId();
  }

  askDelete(review: Review): void {
    this.reviewToDelete.set(review);
  }

  cancelDelete(): void {
    this.reviewToDelete.set(null);
  }

  confirmDelete(): void {
    const review = this.reviewToDelete();
    if (!review) {
      return;
    }

    this.reviewToDelete.set(null);
    this.error.set('');
    this.reviewService.deleteReview(review._id).subscribe({
      next: () => {
        const isLastOnPage = this.reviews().length === 1 && this.page() > 1;
        this.loadPage(isLastOnPage ? this.page() - 1 : this.page());
        this.changed.emit();
      },
      error: (err: HttpErrorResponse) => this.error.set(apiErrorMessage(err)),
    });
  }

  private filters(): ReviewFilters {
    return { search: this.search(), date: this.date()._id, minScore: this.minScore() };
  }
}
