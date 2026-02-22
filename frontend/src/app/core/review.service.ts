import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { tap } from 'rxjs';
import { environment } from '../../environments/environment';
import { Review } from '../models/api.models';

@Injectable({ providedIn: 'root' })
export class ReviewService {
  private http = inject(HttpClient);
  private reviewsByTurf = signal<Record<number, Review[]>>({});

  loadForTurf(turfId: number) {
    return this.http.get<Review[]>(`${environment.apiUrl}/reviews/turf/${turfId}`).pipe(
      tap((reviews) => this.store(turfId, reviews))
    );
  }

  submitReview(payload: {
    turfId: number;
    userId: number;
    rating: number;
    body: string;
    bookingId?: number;
    images?: string[];
  }) {
    return this.http.post<Review>(`${environment.apiUrl}/reviews`, payload).pipe(
      tap((review) => this.upsertReview(payload.turfId, review))
    );
  }

  updateReview(
    turfId: number,
    reviewId: number,
    payload: { rating: number; body: string; images?: string[] }
  ) {
    return this.http.put<Review>(`${environment.apiUrl}/reviews/${reviewId}`, payload).pipe(
      tap((review) => this.upsertReview(turfId, review))
    );
  }

  list(turfId: number) {
    return this.reviewsByTurf()[turfId] ?? [];
  }

  average(turfId: number) {
    const reviews = this.list(turfId);
    if (!reviews.length) {
      return null;
    }
    const sum = reviews.reduce((acc, r) => acc + r.rating, 0);
    return +(sum / reviews.length).toFixed(1);
  }

  private store(turfId: number, reviews: Review[]) {
    this.reviewsByTurf.set({ ...this.reviewsByTurf(), [turfId]: reviews });
  }

  private upsertReview(turfId: number, review: Review) {
    const current = this.list(turfId);
    const exists = current.some((entry) => entry.id === review.id);
    const next = exists
      ? current.map((entry) => (entry.id === review.id ? review : entry))
      : [review, ...current];
    this.store(turfId, next);
  }
}
