import { CommonModule } from '@angular/common';
import { Component, Input, OnInit, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { TurfService } from '../../core/turf.service';
import { ReviewService } from '../../core/review.service';

@Component({
  standalone: true,
  selector: 'app-turf-search',
  imports: [CommonModule, ReactiveFormsModule],
  template: `
    <section class="card">
      <h2>Find a turf</h2>
      <form [formGroup]="filterForm" (ngSubmit)="search()" class="grid grid-2">
        <label>City <input formControlName="city" placeholder="Chennai" /></label>
        <label>Pincode <input formControlName="pincode" placeholder="600041" /></label>
        <label>Sport
          <input formControlName="sport" placeholder="Football, Cricket, etc." />
        </label>
        <label>Amenity
          <select formControlName="amenity">
            <option value="">All</option>
            <option *ngFor="let amenity of amenities" [value]="amenity">{{ amenity }}</option>
          </select>
        </label>
        <label>Min rating
          <input type="number" min="0" max="5" formControlName="rating" />
        </label>
        <label>Max price (?)
          <input type="number" min="0" formControlName="price" />
        </label>
        <label>Sort by
          <select formControlName="sortBy">
            <option value="relevance">Relevance</option>
            <option value="price">Price</option>
            <option value="rating">Rating</option>
          </select>
        </label>
        <button class="btn-primary" type="submit">Search</button>
      </form>
    </section>

    <section class="card">
      <header class="section-head">
        <div>
          <h3>{{ summary() }}</h3>
          <small>{{ statsText() }}</small>
        </div>
        <div class="filters" *ngIf="filterSummary().length">
          <span class="tag" *ngFor="let chip of filterSummary()">{{ chip }}</span>
        </div>
      </header>

      <div class="card-grid">
        <button class="turf-card" type="button" *ngFor="let turf of filteredResults()" (click)="openTurf(turf.id)">
          <div class="turf-card__head">
            <div>
              <strong>{{ turf.name }}</strong>
              <p>{{ turf.city }}, {{ turf.state }} {{ turf.pincode }}</p>
            </div>
            <span class="tag" [ngClass]="{ success: turf.status === 'APPROVED', warn: turf.status !== 'APPROVED' }">{{ turf.status }}</span>
          </div>
          <div class="turf-card__meta">
            <div>
              <small>Sports</small>
              <span>{{ turf.sports?.join(', ') || 'Not listed' }}</span>
            </div>
            <div>
              <small>Amenities</small>
              <span>{{ turf.amenities?.slice(0, 3).join(', ') || 'Not listed' }}</span>
            </div>
          </div>
          <div class="turf-card__footer">
            <span class="rating" [class.muted]="ratingFor(turf.id) === null">
              <ng-container *ngIf="ratingFor(turf.id) !== null; else noRating">
                ★ {{ ratingFor(turf.id) }}/5
              </ng-container>
              <ng-template #noRating>No reviews yet</ng-template>
            </span>
            <span>Tap to open</span>
          </div>
        </button>
      </div>
    </section>
  `,
  styles: [
    `
      form {
        gap: 0.75rem;
      }
      .section-head {
        display: flex;
        justify-content: space-between;
        gap: 1rem;
        flex-wrap: wrap;
      }
      .filters {
        display: flex;
        flex-wrap: wrap;
        gap: 0.5rem;
      }
      .card-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
        gap: 1rem;
      }
      .turf-card {
        border: 1px solid var(--border);
        border-radius: 14px;
        padding: 1rem;
        background: #f8fafc;
        text-align: left;
        cursor: pointer;
        display: flex;
        flex-direction: column;
        gap: 0.75rem;
        transition: border-color 0.2s ease, transform 0.2s ease;
      }
      .turf-card:hover {
        border-color: var(--primary);
        transform: translateY(-2px);
      }
      .turf-card__head {
        display: flex;
        justify-content: space-between;
        gap: 0.5rem;
        align-items: flex-start;
      }
      .turf-card__meta {
        display: flex;
        gap: 1rem;
        flex-wrap: wrap;
        font-size: 0.9rem;
        color: #475569;
      }
      .turf-card__meta small {
        display: block;
        font-size: 0.7rem;
        text-transform: uppercase;
        letter-spacing: 0.08em;
        color: #94a3b8;
      }
      .turf-card__footer {
        display: flex;
        justify-content: space-between;
        align-items: center;
        font-size: 0.85rem;
        color: #475569;
      }
      .rating {
        font-weight: 600;
        color: #0f172a;
      }
      .rating.muted {
        color: #94a3b8;
      }
    `
  ]
})
export class TurfSearchComponent implements OnInit {
  private fb = inject(FormBuilder);
  private turfService = inject(TurfService);
  private reviewService = inject(ReviewService);
  private router = inject(Router);

  @Input() detailRoutePrefix: string = '/app/turfs';

  filterForm = this.fb.nonNullable.group({
    city: [''],
    pincode: [''],
    sport: [''],
    amenity: [''],
    rating: [0],
    price: [0],
    sortBy: ['relevance']
  });

  amenities = ['Cafe', 'Parking', 'Security', 'Service', 'Lockers', 'Showers'];

  ngOnInit() {
    this.search();
  }

  search() {
    const payload = { ...this.filterForm.value, page: 0, size: 20 };
    this.turfService.search(payload).subscribe((page) => {
      page.content.forEach((turf) => this.reviewService.loadForTurf(turf.id).subscribe());
    });
  }

  summary() {
    const page = this.turfService.searchPage();
    return page ? `${page.totalElements} turfs found` : 'Search for turfs';
  }

  statsText() {
    const stats = this.turfService.stats();
    return `${stats.approved} approved | ${stats.pending} pending | ${stats.cities} cities covered`;
  }

  filterSummary() {
    const chips: string[] = [];
    Object.entries(this.filterForm.value).forEach(([key, value]) => {
      if (value && key !== 'sortBy' && Number(value) !== 0) {
        chips.push(`${key}: ${value}`);
      }
    });
    return chips;
  }

  filteredResults() {
    const page = this.turfService.searchPage();
    if (!page) return [];
    const { rating, price, sortBy } = this.filterForm.getRawValue();
    let rows = [...page.content];
    if (rating) {
      rows = rows.filter((turf) => (this.ratingFor(turf.id) ?? 0) >= rating);
    }
    if (price) {
      rows = rows.filter((turf) => this.estimatePrice(turf) <= price);
    }
    if (sortBy === 'price') {
      rows.sort((a, b) => this.estimatePrice(a) - this.estimatePrice(b));
    } else if (sortBy === 'rating') {
      rows.sort((a, b) => (this.ratingFor(b.id) ?? 0) - (this.ratingFor(a.id) ?? 0));
    }
    return rows;
  }

  estimatePrice(turf: any) {
    return (turf.amenities?.length ?? 1) * 500;
  }

  ratingFor(turfId: number) {
    const avg = this.reviewService.average(turfId);
    return avg ?? null;
  }

  openTurf(id: number) {
    const turf = this.turfService.getFromCache(id);
    if (turf) {
      this.turfService.rememberSelection(turf);
    }
    const extras = turf ? { state: turf } : undefined;
    const base = this.detailRoutePrefix && this.detailRoutePrefix.trim().length
      ? this.detailRoutePrefix
      : '/app/turfs';
    const normalized = base.endsWith('/') ? base.slice(0, -1) : base;
    this.router.navigateByUrl(`${normalized}/${id}`, extras);
  }
}
