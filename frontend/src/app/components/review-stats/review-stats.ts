import { DecimalPipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, effect, inject, input, signal, untracked } from '@angular/core';

import { REVIEW_CRITERIA_LABELS, ReviewStats as Stats } from '../../models';
import { ReviewService } from '../../services/review.service';
import { apiErrorMessage } from '../../utils/api-error';

// El resumen estadístico de las valoraciones de un Date (lo calcula MongoDB con un aggregate).
// Va dentro de la vista de Dates, encima del listado de valoraciones
@Component({
  selector: 'app-review-stats',
  imports: [DecimalPipe],
  templateUrl: './review-stats.html',
  styleUrl: './review-stats.css',
})
export class ReviewStats {
  private reviewService = inject(ReviewService);

  // El Date del que se enseña el resumen
  dateId = input.required<string>();

  // El padre lo cambia cuando se borra una valoración, para que el resumen se vuelva a pedir
  refresh = input(0);

  labels = REVIEW_CRITERIA_LABELS;

  stats = signal<Stats | null>(null);
  loading = signal(true);
  error = signal('');

  constructor() {
    // Cada vez que cambia el Date (o el padre pide refrescar) se vuelve a pedir el resumen.
    // untracked: dentro de load() se escriben signals, y no quiero que el effect dependa de ellas
    effect(() => {
      const dateId = this.dateId();
      this.refresh();
      untracked(() => this.load(dateId));
    });
  }

  // Ancho de la barra de un criterio: la media sobre 5, en porcentaje
  barWidth(average: number): string {
    return `${(average / 5) * 100}%`;
  }

  private load(dateId: string): void {
    this.loading.set(true);
    this.error.set('');
    this.reviewService.getStats(dateId).subscribe({
      next: (response) => {
        this.stats.set(response.stats);
        this.loading.set(false);
      },
      error: (err: HttpErrorResponse) => {
        this.error.set(apiErrorMessage(err));
        this.loading.set(false);
      },
    });
  }
}
