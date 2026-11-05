import { HttpErrorResponse } from '@angular/common/http';
import { Component, OnInit, inject, input, signal } from '@angular/core';
import {
  AbstractControl,
  NonNullableFormBuilder,
  ReactiveFormsModule,
  ValidationErrors,
  ValidatorFn,
  Validators,
} from '@angular/forms';
import { Router, RouterLink } from '@angular/router';

import { CriterionScore, REVIEW_CRITERIA, REVIEW_CRITERIA_LABELS, REVIEW_SCORES, Review } from '../../models';
import { ReviewService } from '../../services/review.service';
import { apiErrorMessage } from '../../utils/api-error';

// Validador del vector de criterios: hay que puntuar al menos uno (como pide la API)
const atLeastOneCriterion: ValidatorFn = (control: AbstractControl): ValidationErrors | null => {
  const rows = control.value as { included: boolean }[];
  return rows.some((row) => row.included) ? null : { noCriteria: true };
};

// Valorar un Date (dates/:dateId/reviews/new) o editar una valoración (reviews/:id/edit).
// El autor no se envía: la API lo saca del token
@Component({
  selector: 'app-review-form',
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './review-form.html',
  styleUrl: './review-form.css',
})
export class ReviewForm implements OnInit {
  private fb = inject(NonNullableFormBuilder);
  private reviewService = inject(ReviewService);
  private router = inject(Router);

  // Vienen de la ruta: dateId al crear, id al editar
  dateId = input<string>();
  id = input<string>();

  labels = REVIEW_CRITERIA_LABELS;
  scores = REVIEW_SCORES;

  loading = signal(false);
  loadFailed = signal(false);
  saving = signal(false);
  error = signal('');

  // El Date de la valoración: al crear sale de la URL; al editar, de la valoración
  private reviewDateId = '';

  // Una fila por criterio. included dice si se puntúa (solo se envían los marcados)
  form = this.fb.group({
    criteria: this.fb.array(
      REVIEW_CRITERIA.map((criterion) =>
        this.fb.group({
          criterion: [criterion],
          included: [true],
          score: [3, [Validators.required, Validators.min(1), Validators.max(5)]],
          met: [true],
        }),
      ),
      { validators: atLeastOneCriterion },
    ),
    comment: ['', Validators.maxLength(500)],
    wouldRepeat: [true],
  });

  get criteriaRows() {
    return this.form.controls.criteria.controls;
  }

  ngOnInit(): void {
    const id = this.id();

    if (!id) {
      this.reviewDateId = this.dateId() ?? '';
      return;
    }

    this.loading.set(true);
    this.reviewService.getReview(id).subscribe({
      next: (response) => {
        this.fillForm(response.review);
        this.loading.set(false);
      },
      error: (err: HttpErrorResponse) => {
        this.error.set(apiErrorMessage(err));
        this.loadFailed.set(true);
        this.loading.set(false);
      },
    });
  }

  save(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const value = this.form.getRawValue();

    // Del formulario a los subdocumentos que espera la API: solo los criterios marcados, sin included
    const criteria: CriterionScore[] = value.criteria
      .filter((row) => row.included)
      .map((row) => ({ criterion: row.criterion, score: Number(row.score), met: row.met }));

    // El comentario puede ir vacío ('' borra el que hubiera); la API lo acepta
    const payload = { criteria, comment: value.comment.trim(), wouldRepeat: value.wouldRepeat };

    const id = this.id();
    const request = id
      ? this.reviewService.updateReview(id, payload)
      : this.reviewService.createReview({ ...payload, date: this.reviewDateId });

    this.saving.set(true);
    this.error.set('');
    request.subscribe({
      // Vuelvo a los Dates con las valoraciones de este Date abiertas
      next: () =>
        this.router.navigate(['/dates'], {
          queryParams: { reviews: this.reviewDateId },
          replaceUrl: true,
        }),
      // 409 si el Date está pendiente o ya lo has valorado; 403 si no es tu valoración
      error: (err: HttpErrorResponse) => {
        this.error.set(apiErrorMessage(err));
        this.saving.set(false);
      },
    });
  }

  private fillForm(review: Review): void {
    this.reviewDateId = review.date._id;

    // Cada fila se marca si la valoración tiene ese criterio, con su nota
    this.criteriaRows.forEach((row) => {
      const saved = review.criteria.find((item) => item.criterion === row.controls.criterion.value);
      row.patchValue({
        included: !!saved,
        score: saved?.score ?? 3,
        met: saved?.met ?? true,
      });
    });

    this.form.patchValue({ comment: review.comment ?? '', wouldRepeat: review.wouldRepeat });
  }
}
