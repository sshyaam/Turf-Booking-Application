import { CommonModule } from '@angular/common';
import { Component, OnInit, computed, effect, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { TurfService } from '../../core/turf.service';
import { AuthService } from '../../core/auth.service';
import { BookingService } from '../../core/booking.service';
import { ReviewService } from '../../core/review.service';
import { MaintenanceService } from '../../core/maintenance.service';
import { BookingSummary, BookingTransaction, Turf } from '../../models/api.models';

import { environment } from '../../../environments/environment';
import { TurfCreateComponent } from './turf-create.component';

interface ModeratorContact {
  id: string;
  value: string;
  type: 'email' | 'phone';
}

interface TurfMetric {
  totalSlots: number;
  bookedSlots: number;
  revenue: number;
  nextFree?: string;
}

const MOD_STORAGE_KEY = 'tb.turfModerators';

@Component({
  standalone: true,
  selector: 'app-turf-manage',
  imports: [CommonModule, FormsModule, TurfCreateComponent],
  template: `
    <section class="card">
      <button class="back-button" type="button" (click)="goBack()">&larr; Back</button>
      <div class="section-head">
        <div>
          <h2>Manage turfs</h2>
          <p class="muted">Select a turf to view performance, updates, and reviews. Use the plus widget to create a new one.</p>
        </div>
      </div>
      <div class="tile-grid single">
        <button class="tile add" type="button" (click)="toggleCreatePanel()">
          <span>{{ createPanelOpen() ? '×' : '+' }}</span>
          <strong>{{ createPanelOpen() ? 'Hide create turf form' : 'Create turf' }}</strong>
          <small>Use the in-place form with all required fields.</small>
        </button>
      </div>
      <div class="create-panel" *ngIf="createPanelOpen()">
        <app-turf-create [showBackButton]="false" />
      </div>
      <div class="section-group" *ngIf="ownedTurfs().length">
        <h4>Owned by you</h4>
        <div class="tile-grid">
          <button
            class="tile"
            type="button"
            *ngFor="let turf of ownedTurfs()"
            (click)="selectTurf(turf)"
            [class.active]="selectedTurf()?.id === turf.id"
          >
            <strong>{{ turf.name }}</strong>
            <small>{{ turf.city }}, {{ turf.state }}</small>
            <span class="tag" [ngClass]="{ success: turf.status === 'APPROVED', warn: turf.status !== 'APPROVED' }">
              {{ turf.status }}
            </span>
          </button>
        </div>
      </div>
      <div class="section-group" *ngIf="moderatedTurfs().length">
        <h4>You moderate</h4>
        <div class="tile-grid">
          <button
            class="tile"
            type="button"
            *ngFor="let turf of moderatedTurfs()"
            (click)="selectTurf(turf)"
            [class.active]="selectedTurf()?.id === turf.id"
          >
            <strong>{{ turf.name }}</strong>
            <small>{{ turf.city }}, {{ turf.state }}</small>
            <span class="tag" [ngClass]="{ success: turf.status === 'APPROVED', warn: turf.status !== 'APPROVED' }">
              {{ turf.status }}
            </span>
          </button>
        </div>
      </div>
      <p class="muted" *ngIf="!ownedTurfs().length && !moderatedTurfs().length">
        You do not manage any turfs yet. Create one to get started.
      </p>
    </section>

    <section class="card detail" *ngIf="selectedTurf(); else pickHint">
      <header class="section-head">
        <div>
          <h3>{{ selectedTurf()?.name }}</h3>
          <p class="muted">{{ selectedTurf()?.city }}, {{ selectedTurf()?.state }} {{ selectedTurf()?.pincode }}</p>
          <p class="muted">Base hourly: ₹{{ (selectedTurf()?.hourlyPrice || 0) / 100 }}</p>
          <div class="chip-row" *ngIf="customPricingList().length">
            <span class="chip" *ngFor="let entry of customPricingList()">
              {{ entry.day }} – ₹{{ entry.price / 100 }}
            </span>
          </div>
        </div>
        <div class="metrics">
          <div>
            <strong>{{ metricsFor(selectedTurf()!.id)?.totalSlots || 0 }}</strong>
            <span>Total slots</span>
          </div>
          <div>
            <strong>{{ metricsFor(selectedTurf()!.id)?.bookedSlots || 0 }}</strong>
            <span>Booked</span>
          </div>
          <div>
            <strong>₹ {{ metricsFor(selectedTurf()!.id)?.revenue || 0 }}</strong>
            <span>Revenue</span>
          </div>
          <div>
            <strong>{{ metricsFor(selectedTurf()!.id)?.nextFree || '—' }}</strong>
            <span>Next free slot</span>
          </div>
        </div>
      </header>

      <div class="detail-grid">
        <section>
          <h4>Moderators</h4>
          <div class="chip-row">
            <span class="chip" *ngFor="let mod of moderatorsFor(selectedTurf()!.id)">
              {{ mod.value }} ({{ mod.type }})
              <button
                type="button"
                [disabled]="!canRemoveModerator(mod)"
                [title]="canRemoveModerator(mod) ? '' : 'You cannot remove yourself'"
                (click)="removeModerator(selectedTurf()!.id, mod.id)"
              >
                &times;
              </button>
            </span>
          </div>
          <div class="grid grid-3">
            <label>Contact
              <input [(ngModel)]="moderatorDrafts[selectedTurf()!.id].contact" placeholder="coach@club.com" />
            </label>
            <label>Type
              <select [(ngModel)]="moderatorDrafts[selectedTurf()!.id].type">
                <option value="email">Email</option>
                <option value="phone">Phone</option>
              </select>
            </label>
            <button class="btn-secondary" type="button" (click)="addModerator(selectedTurf()!.id)">Add</button>
          </div>
        </section>

        <section>
          <h4>Photos</h4>
          <ng-container *ngIf="selectedTurf()?.imageUrls?.length; else noTurfPhotos">
            <div class="photo-wall">
              <img *ngFor="let img of selectedTurf()?.imageUrls" [src]="photoUrl(img)" alt="Turf photo" />
            </div>
          </ng-container>
          <ng-template #noTurfPhotos>
            <p class="muted">No photos uploaded yet.</p>
          </ng-template>
          <label class="btn-secondary upload">
            Upload image
            <input type="file" (change)="onExistingPhoto($event, selectedTurf()!.id)" />
          </label>
          <button class="btn-secondary" type="button" (click)="uploadExisting(selectedTurf()!.id)" [disabled]="!pendingUploads[selectedTurf()!.id]">
            Send file
          </button>
          <small class="muted">{{ uploadStatuses()[selectedTurf()!.id] }}</small>
          <small class="muted" *ngIf="photoError()">{{ photoError() }}</small>
        </section>

        <section>
          <h4>Maintenance blocks</h4>
          <div class="grid grid-3">
            <label>Reason
              <input [(ngModel)]="maintenanceDraft.reason" placeholder="Reason" />
            </label>
            <label>Start
              <input type="datetime-local" [(ngModel)]="maintenanceDraft.startAt" />
            </label>
            <label>End
              <input type="datetime-local" [(ngModel)]="maintenanceDraft.endAt" />
            </label>
          </div>
          <button class="btn-secondary" type="button" (click)="blockMaintenance()">Block slots</button>
          <small class="muted">{{ maintenanceStatus() }}</small>
          <ul>
            <li *ngFor="let block of maintenanceBlocks()">
              {{ block.startAt | date: 'short' }} → {{ block.endAt | date: 'short' }} — {{ block.reason }}
            </li>
          </ul>
        </section>
      </div>

      <section class="reviews">
        <h4>Reviews & ratings</h4>
        <p class="muted" *ngIf="!reviews().length">No reviews captured yet.</p>
        <article class="review-card" *ngFor="let review of reviews()">
          <header>
            <strong>{{ review.rating }}/5</strong>
            <small>{{ review.createdAt | date: 'short' }}</small>
          </header>
          <p>{{ review.body || 'No comments provided.' }}</p>
          <div class="preview-row" *ngIf="review.images?.length">
            <img *ngFor="let photo of review.images" [src]="photo" alt="Review photo" />
          </div>
        </article>
      </section>
    </section>

    <section class="card">
      <h3>Bookings</h3>
      <table class="table" *ngIf="bookingSummaries().length; else noBookings">
        <thead>
          <tr>
            <th>Slot</th>
            <th>Sport/Amenity</th>
            <th>User</th>
          </tr>
        </thead>
        <tbody>
          <tr *ngFor="let booking of bookingSummaries()">
            <td>{{ booking.startAt | date: 'short' }} – {{ booking.endAt | date: 'shortTime' }}</td>
            <td>{{ booking.sport || 'Any' }} / {{ booking.amenity || '—' }}</td>
            <td>
              {{ booking.user.fullName }}<br />
              <small>{{ booking.user.email || booking.user.phone }}</small>
            </td>
          </tr>
        </tbody>
      </table>
      <ng-template #noBookings>
        <p class="muted">No bookings recorded yet.</p>
      </ng-template>
    </section>

    <section class="card" *ngIf="transactions().length">
      <h3>Recent transactions</h3>
      <ul class="transaction-list">
        <li *ngFor="let tx of transactions()">
          <div class="tx-head">
            <strong>{{ tx.type }}</strong>
            <small>{{ tx.createdAt | date: 'short' }}</small>
          </div>
          <div class="tx-body">
            Booking #{{ tx.bookingId }} · {{ tx.actor.fullName || tx.actor.email || tx.actor.phone || 'Unknown player' }}
          </div>
          <div class="muted">{{ tx.message || 'No additional details.' }}</div>
        </li>
      </ul>
    </section>

    <ng-template #pickHint>
      <p class="card muted">Select a turf to view its details and reviews.</p>
    </ng-template>
  `,
  styles: [
    `
      .tile-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
        gap: 1rem;
      }
      .tile-grid.single {
        grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
      }
      .section-group {
        margin-top: 1rem;
      }
      .section-group h4 {
        margin: 0 0 0.5rem;
      }
      .tile {
        border: 1px solid var(--border);
        border-radius: 14px;
        padding: 1rem;
        display: flex;
        flex-direction: column;
        gap: 0.35rem;
        background: #f8fafc;
        cursor: pointer;
        text-align: left;
      }
      .tile small {
        color: #475569;
      }
      .tile.add {
        align-items: center;
        justify-content: center;
        font-size: 0.95rem;
        text-decoration: none;
      }
      .tile.add span {
        font-size: 2rem;
        line-height: 1;
      }
      .create-panel {
        margin-top: 1rem;
      }
      .tile.active {
        border-color: var(--primary);
        background: #e0f2fe;
      }
      .detail {
        margin-top: 1.5rem;
      }
      .metrics {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
        gap: 0.75rem;
      }
      .metrics span {
        display: block;
        font-size: 0.8rem;
        color: #475569;
      }
      .chip-row {
        display: flex;
        flex-wrap: wrap;
        gap: 0.5rem;
        margin: 0.5rem 0 1rem;
      }
      .chip {
        background: #e2e8f0;
        border-radius: 999px;
        padding: 0.25rem 0.75rem;
        display: inline-flex;
        gap: 0.35rem;
        align-items: center;
      }
      .chip button {
        border: none;
        background: transparent;
        cursor: pointer;
      }
      .photo-wall {
        display: flex;
        flex-wrap: wrap;
        gap: 0.5rem;
        margin: 0.5rem 0 0.75rem;
      }
      .photo-wall img {
        width: 88px;
        height: 88px;
        object-fit: cover;
        border-radius: 8px;
        border: 1px solid var(--border);
      }
      .detail-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
        gap: 1rem;
        margin-top: 1.5rem;
      }
      .upload {
        position: relative;
        overflow: hidden;
        display: inline-flex;
        width: fit-content;
        margin-right: 0.75rem;
      }
      .upload input {
        position: absolute;
        inset: 0;
        opacity: 0;
        cursor: pointer;
      }
      .reviews {
        margin-top: 1.5rem;
      }
      .review-card {
        border: 1px solid var(--border);
        border-radius: 10px;
        padding: 0.75rem;
        margin-top: 0.75rem;
      }
      .review-card header {
        display: flex;
        justify-content: space-between;
        margin-bottom: 0.5rem;
      }
      .preview-row {
        display: flex;
        flex-wrap: wrap;
        gap: 0.5rem;
      }
      .preview-row img {
        width: 56px;
        height: 56px;
        object-fit: cover;
        border-radius: 6px;
        border: 1px solid var(--border);
      }
      .muted {
        color: #475569;
      }
      .tag {
        width: fit-content;
      }
      ul {
        list-style: none;
        padding-left: 0;
      }
      .transaction-list {
        list-style: none;
        padding: 0;
        margin: 0;
        display: flex;
        flex-direction: column;
        gap: 0.75rem;
      }
      .transaction-list li {
        border: 1px solid var(--border);
        border-radius: 10px;
        padding: 0.75rem;
      }
      .tx-head {
        display: flex;
        justify-content: space-between;
        align-items: center;
        font-size: 0.85rem;
      }
      .tx-body {
        font-weight: 600;
        margin: 0.35rem 0;
      }
    `
  ]
})
export class TurfManageComponent implements OnInit {
  private turfService = inject(TurfService);
  private bookingService = inject(BookingService);
  private reviewService = inject(ReviewService);
  private maintenanceService = inject(MaintenanceService);
  private auth = inject(AuthService);
  private router = inject(Router);

  readonly managedTurfs = this.turfService.managedTurfs;
  readonly ownedTurfs = computed(() => {
    const userId = this.auth.user()?.id;
    if (!userId) {
      return [] as Turf[];
    }
    return this.managedTurfs().filter((turf) => turf.managers?.[0]?.id === userId);
  });
  readonly moderatedTurfs = computed(() => {
    const userId = this.auth.user()?.id;
    if (!userId) {
      return [] as Turf[];
    }
    return this.managedTurfs().filter(
      (turf) => turf.managers?.some((manager) => manager.id === userId) && turf.managers?.[0]?.id !== userId
    );
  });
  readonly displayTurfs = computed(() => {
    const combined = [...this.ownedTurfs(), ...this.moderatedTurfs()];
    const seen = new Map<number, Turf>();
    combined.forEach((turf) => {
      seen.set(turf.id, turf);
    });
    return Array.from(seen.values());
  });
  selectedTurf = signal<Turf | null>(null);
  moderatorStore = signal<Record<number, ModeratorContact[]>>(this.loadModeratorStore());
  moderatorDrafts: Record<number, { contact: string; type: 'email' | 'phone' }> = {};
  pendingUploads: Record<number, File | null> = {};
  uploadStatuses = signal<Record<number, string>>({});
  turfMetrics = signal<Record<number, TurfMetric>>({});
  photoError = signal('');
  maintenanceStatus = signal('');
  maintenanceDraft = { reason: '', startAt: '', endAt: '' };
  createPanelOpen = signal(false);

  constructor() {
    effect(() => {
      const turf = this.selectedTurf();
      const turfId = this.validTurfId(turf);
      if (!turf || turfId === null) {
        return;
      }
      this.reviewService.loadForTurf(turfId).subscribe();
      this.maintenanceService.list(turfId).subscribe();
      this.bookingService.loadBookingSummaries(turfId).subscribe();
      this.bookingService.loadTransactions(turfId).subscribe();
    });

    effect(() => {
      const turfs = this.displayTurfs();
      turfs.forEach((turf) => {
        const turfId = this.validTurfId(turf);
        if (turfId === null) {
          return;
        }
        this.moderatorDrafts[turfId] = this.moderatorDrafts[turfId] ?? { contact: '', type: 'email' };
        this.bookingService.loadSlots(turfId).subscribe(() => this.computeMetrics(turfId));
      });
      if (!this.selectedTurf() && turfs.length) {
        this.selectTurf(turfs[0]);
      }
    });
  }

  ngOnInit() {
    this.turfService.loadMine().subscribe({
      error: () => this.turfService.loadAll(100).subscribe()
    });
  }

  selectTurf(turf: Turf) {
    const turfId = this.validTurfId(turf);
    if (turfId === null) {
      return;
    }
    this.moderatorDrafts[turfId] = this.moderatorDrafts[turfId] ?? { contact: '', type: 'email' };
    this.selectedTurf.set(turf);
  }

  moderatorsFor(turfId: number) {
    return this.moderatorStore()[turfId] ?? [];
  }

  addModerator(turfId: number) {
    const draft = this.moderatorDrafts[turfId];
    if (!draft?.contact) return;
    const entry: ModeratorContact = { id: crypto.randomUUID(), value: draft.contact, type: draft.type };
    const next = { ...this.moderatorStore() };
    next[turfId] = [entry, ...(next[turfId] ?? [])];
    this.persistModeratorStore(next);
    this.moderatorDrafts[turfId] = { contact: '', type: draft.type };
  }

  removeModerator(turfId: number, id: string) {
    const next = { ...this.moderatorStore() };
    next[turfId] = (next[turfId] ?? []).filter((mod) => mod.id !== id);
    this.persistModeratorStore(next);
  }

  canRemoveModerator(mod: ModeratorContact) {
    const user = this.auth.user();
    if (!user) {
      return true;
    }
    if (mod.type === 'email' && user.email) {
      return mod.value.toLowerCase() !== user.email.toLowerCase();
    }
    if (mod.type === 'phone' && user.phone) {
      return this.normalizeDigits(mod.value) !== this.normalizeDigits(user.phone);
    }
    return true;
  }

  onExistingPhoto(event: Event, turfId: number) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      this.photoError.set('Image exceeds 2MB. Please upload a smaller file.');
      input.value = '';
      return;
    }
    this.photoError.set('');
    this.pendingUploads[turfId] = file;
    input.value = '';
  }

  uploadExisting(turfId: number) {
    const file = this.pendingUploads[turfId];
    if (!file) return;
    this.turfService.uploadImage(turfId, file).subscribe({
      next: (turf) => {
        this.pendingUploads[turfId] = null;
        this.uploadStatuses.set({ ...this.uploadStatuses(), [turfId]: 'Uploaded!' });
        this.selectedTurf.set(turf);
      },
      error: () => this.uploadStatuses.set({ ...this.uploadStatuses(), [turfId]: 'Upload failed' })
    });
  }

  reviews() {
    const turfId = this.validTurfId(this.selectedTurf());
    return turfId !== null ? this.reviewService.list(turfId) : [];
  }

  customPricingList() {
    const turf = this.selectedTurf();
    if (!turf?.customPricing) {
      return [];
    }
    return Object.entries(turf.customPricing).map(([day, price]) => ({ day, price }));
  }

  photoUrl(path?: string | null) {
    if (!path) {
      return '';
    }
    if (path.startsWith('data:')) {
      return path;
    }
    return path.startsWith('http') ? path : `${environment.fileBaseUrl}${path}`;
  }

  maintenanceBlocks() {
    const turfId = this.validTurfId(this.selectedTurf());
    return turfId !== null ? this.maintenanceService.blocksFor(turfId) : [];
  }

  bookingSummaries(): BookingSummary[] {
    const turfId = this.validTurfId(this.selectedTurf());
    return turfId !== null ? this.bookingService.bookingsForManagement(turfId) : [];
  }

  transactions(): BookingTransaction[] {
    const turfId = this.validTurfId(this.selectedTurf());
    return turfId !== null ? this.bookingService.transactionsFor(turfId) : [];
  }

  blockMaintenance() {
    const turf = this.selectedTurf();
    const turfId = this.validTurfId(turf);
    if (
      !turf ||
      turfId === null ||
      !this.maintenanceDraft.reason ||
      !this.maintenanceDraft.startAt ||
      !this.maintenanceDraft.endAt
    ) {
      return;
    }
    const payload = {
      turfId,
      reason: this.maintenanceDraft.reason,
      startAt: new Date(this.maintenanceDraft.startAt).toISOString(),
      endAt: new Date(this.maintenanceDraft.endAt).toISOString()
    };
    this.maintenanceService.create(payload).subscribe({
      next: () => {
        this.maintenanceStatus.set('Maintenance block added.');
        this.maintenanceDraft = { reason: '', startAt: '', endAt: '' };
      },
      error: () => this.maintenanceStatus.set('Unable to block slots right now.')
    });
  }

  metricsFor(turfId: number) {
    return this.turfMetrics()[turfId];
  }

  toggleCreatePanel() {
    this.createPanelOpen.set(!this.createPanelOpen());
  }

  goBack() {
    this.router.navigate(['/app/turfs']);
  }

  private computeMetrics(turfId: number) {
    if (!Number.isFinite(turfId)) {
      return;
    }
    const slots = this.bookingService.slotsFor(turfId);
    if (!slots.length) {
      return;
    }
    const totalSlots = slots.length;
    const bookedSlots = slots.filter((s) => s.status === 'BOOKED').length;
    const revenue = slots.filter((s) => s.status === 'BOOKED').reduce((sum, slot) => sum + (slot.price || 0), 0);
    const nextFree = slots
      .filter((s) => s.status === 'FREE')
      .map((s) => s.startAt)
      .sort((a, b) => a.localeCompare(b))[0];
    this.turfMetrics.set({
      ...this.turfMetrics(),
      [turfId]: {
        totalSlots,
        bookedSlots,
        revenue,
        nextFree: nextFree ? new Date(nextFree).toLocaleString() : undefined
      }
    });
  }

  private loadModeratorStore(): Record<number, ModeratorContact[]> {
    try {
      const raw = localStorage.getItem(MOD_STORAGE_KEY);
      return raw ? (JSON.parse(raw) as Record<number, ModeratorContact[]>) : {};
    } catch {
      return {};
    }
  }

  private normalizeDigits(value?: string | null) {
    return value ? value.replace(/\D+/g, '') : '';
  }

  private persistModeratorStore(map: Record<number, ModeratorContact[]>) {
    this.moderatorStore.set(map);
    localStorage.setItem(MOD_STORAGE_KEY, JSON.stringify(map));
  }

  private validTurfId(turf?: Turf | null) {
    const id = turf?.id;
    return typeof id === 'number' && Number.isFinite(id) ? id : null;
  }
}
