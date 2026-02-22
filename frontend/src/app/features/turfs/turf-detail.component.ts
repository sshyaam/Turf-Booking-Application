import { CommonModule, Location } from '@angular/common';
import { Component, OnDestroy, OnInit, computed, inject, signal } from '@angular/core';
import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { forkJoin, of, switchMap, tap } from 'rxjs';
import { Slot, Turf, MaintenanceBlock, UserSummary, Review } from '../../models/api.models';
import { BookingService, CreateSlotPayload } from '../../core/booking.service';
import { ReviewService } from '../../core/review.service';
import { TurfService } from '../../core/turf.service';
import { AuthService } from '../../core/auth.service';
import { NotificationService } from '../../core/notification.service';
import { MaintenanceService } from '../../core/maintenance.service';
import { UserDirectoryService } from '../../core/user-directory.service';
import { environment } from '../../../environments/environment';

const MAX_IMAGE_BYTES = 2 * 1024 * 1024;

interface HourBlock {
  label: string;
  slot?: Slot;
  status: 'FREE' | 'HOLD' | 'BOOKED' | 'UNAVAILABLE';
  start: Date;
  end: Date;
}

interface InviteContact {
  value: string;
  label: string;
  type: 'email' | 'phone';
}

@Component({
  standalone: true,
  selector: 'app-turf-detail',
  imports: [CommonModule, ReactiveFormsModule, FormsModule],
  template: `
    <ng-container *ngIf="hasValidTurfId && turf(); else missing">
      <button class="back-button" type="button" (click)="goBack()">&larr; Back</button>
      <section class="card hero">
        <div>
          <h2>{{ turf()?.name }}</h2>
          <p>{{ turf()?.city }}, {{ turf()?.state }} {{ turf()?.pincode }}</p>
          <p class="muted">Sports: {{ turf()?.sports?.join(', ') || 'Not provided' }}</p>
        </div>
        <div class="hero-meta">
          <span class="tag" [ngClass]="{ success: turf()?.status === 'APPROVED', warn: turf()?.status !== 'APPROVED' }">
            {{ turf()?.status }}
          </span>
          <span class="tag">Hours {{ turf()?.openTime || 'NA' }} – {{ turf()?.closeTime || 'NA' }}</span>
          <span class="tag">₹{{ (turf()?.hourlyPrice || 0) / 100 }}/hr</span>
          <span class="tag" *ngIf="averageRating() !== null">★ {{ averageRating() }}/5</span>
        </div>
      </section>

      <section class="card photo-gallery">
        <h3>Photos</h3>
        <ng-container *ngIf="turf()?.imageUrls?.length; else detailNoPhotos">
          <div class="photo-wall">
            <img *ngFor="let img of turf()?.imageUrls" [src]="photoUrl(img)" alt="Turf photo" />
          </div>
        </ng-container>
        <ng-template #detailNoPhotos>
          <p class="muted">No photos uploaded yet.</p>
        </ng-template>
      </section>

      <section class="card booking-shell">
        <div class="schedule">
          <header>
            <div>
              <h3>Select a slot</h3>
              <p class="muted">Slots display in 1-hour intervals between the turf's opening and closing time.</p>
            </div>
            <div class="filters">
              <label *ngIf="sportOptions().length > 1">
                Sport
                <select [ngModel]="selectedSport()" (ngModelChange)="onSportChange($event)">
                  <option *ngFor="let sport of sportOptions()" [ngValue]="sport">{{ sport }}</option>
                </select>
              </label>
              <label>
                Date
                <input type="date" [value]="selectedDate()" (change)="onDateChange($event)" />
              </label>
            </div>
          </header>
          <div class="timeline">
            <button
              class="slot-chip"
              *ngFor="let block of hourlySlots()"
              type="button"
              [disabled]="block.status !== 'FREE' || !block.slot"
              [class.selected]="isSelected(block.slot)"
              [ngClass]="block.status.toLowerCase()"
              (click)="toggleSlot(block)"
            >
              <strong>{{ block.label }}</strong>
              <small>{{ statusText(block.status) }}</small>
            </button>
          </div>
        </div>

        <div class="book-panel">
          <h3>Book your slots</h3>
          <ng-container *ngIf="selectedSlots().length; else selectHint">
            <p class="muted">
              {{ selectedSlots().length }} slot(s) selected ·
              {{ selectedSlots()[0]?.startAt | date: 'mediumDate' }}
            </p>
            <ul class="selection-list">
              <li *ngFor="let slot of selectedSlots()">
                {{ slot.startAt | date: 'shortTime' }} → {{ slot.endAt | date: 'shortTime' }}
                ({{ slot.sport || selectedSport() || 'Any sport' }})
              </li>
            </ul>
            <button class="btn-secondary" type="button" (click)="clearSelection()">Clear selection</button>
            <form [formGroup]="paymentForm" (ngSubmit)="book()" class="grid">
              <label>Payment method
                <select formControlName="method">
                  <option value="CARD">Card</option>
                  <option value="UPI">UPI</option>
                </select>
              </label>
              <ng-container [ngSwitch]="paymentForm.value.method">
                <label *ngSwitchCase="'CARD'">
                  Card number
                  <input formControlName="cardNumber" placeholder="4111 1111 1111 1111" />
                </label>
                <label *ngSwitchCase="'CARD'">
                  Name on card
                  <input formControlName="cardName" placeholder="Player One" />
                </label>
                <label *ngSwitchCase="'UPI'">
                  UPI handle
                  <input formControlName="upiHandle" placeholder="player@upi" />
                </label>
              </ng-container>
              <label class="checkbox">
                <input type="checkbox" formControlName="refundable" /> I agree to terms and conditions.
              </label>
              <div class="invite-block">
                <label>Invite players (optional)</label>
                <div class="invite-row">
                  <input
                    placeholder="Email or phone"
                    [(ngModel)]="inviteDraft"
                    [ngModelOptions]="{ standalone: true }"
                    [disabled]="inviteChecking()"
                  />
                  <button class="btn-secondary" type="button" (click)="addInvitee()" [disabled]="inviteChecking()">
                    Add
                  </button>
                </div>
                <small class="muted" *ngIf="inviteChecking()">Validating player…</small>
                <small class="muted error" *ngIf="inviteError()">{{ inviteError() }}</small>
                <small class="muted">We will notify them after you confirm this booking.</small>
                <div class="chip-row" *ngIf="invitees().length">
                  <span class="chip" *ngFor="let guest of invitees(); let i = index">
                    {{ guest.label }}
                    <button type="button" (click)="removeInvitee(i)">x</button>
                  </span>
                </div>
              </div>
              <button class="btn-primary" type="submit" [disabled]="!canBook()">Confirm booking</button>
            </form>
            <p class="muted" *ngIf="!canBook()">Sign in to complete the booking.</p>
            <p class="muted" *ngIf="bookingMessage()">{{ bookingMessage() }}</p>
          </ng-container>
          <ng-template #selectHint>
            <p>Select a green (free) slot from the list to proceed.</p>
          </ng-template>
        </div>
      </section>

      <section class="card">
        <h3>Reviews & photos</h3>
        <ng-container *ngIf="eligibleToReview(); else reviewHint">
          <form [formGroup]="reviewForm" (ngSubmit)="submitReview()" class="grid">
            <label>Rating
              <input type="number" min="1" max="5" formControlName="rating" />
            </label>
            <label>Comments
              <textarea rows="3" formControlName="body"></textarea>
            </label>
            <label class="upload">
              Upload images
              <input type="file" multiple (change)="onReviewImages($event)" />
            </label>
            <small class="muted" *ngIf="imageError()">{{ imageError() }}</small>
            <div class="preview-row" *ngIf="reviewImages().length">
              <img *ngFor="let img of reviewImages()" [src]="img" alt="Preview" />
            </div>
            <div class="review-actions">
              <span class="muted" *ngIf="existingReview()">Editing your previous review.</span>
              <button class="btn-secondary" type="submit" [disabled]="reviewForm.invalid">
                {{ existingReview() ? 'Update review' : 'Post review' }}
              </button>
            </div>
          </form>
        </ng-container>
        <ng-template #reviewHint>
          <p class="muted">Only players who have booked this turf can leave a review.</p>
        </ng-template>
        <div class="review-item" *ngFor="let review of reviews()">
          <header>
            <strong>{{ review.rating }}/5</strong>
            <span>
              {{
                review.user?.fullName
                  || (review.userId ? ('Player #' + review.userId) : 'Player')
              }}
            </span>
          </header>
          <p>{{ review.body || 'No comments provided.' }}</p>
          <div class="preview-row" *ngIf="review.images?.length">
            <img *ngFor="let photo of review.images" [src]="reviewPhotoUrl(photo)" alt="Review photo" />
          </div>
        </div>
      </section>
    </ng-container>

    <ng-template #missing>
      <div class="card">
        <button class="back-button" type="button" (click)="goBack()">&larr; Back</button>
        <p *ngIf="hasValidTurfId; else invalidHint">
          Open this page from the search list to load turf details.
        </p>
        <ng-template #invalidHint>
          <p>Choose a turf from the Find Turf page before opening its details.</p>
        </ng-template>
      </div>
    </ng-template>
  `,
  styles: [
    `
      .hero {
        display: flex;
        flex-wrap: wrap;
        justify-content: space-between;
        gap: 1rem;
      }
      .hero-meta {
        display: flex;
        gap: 0.5rem;
        flex-wrap: wrap;
        align-items: center;
      }
      .booking-shell {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
        gap: 1.5rem;
      }
      .photo-gallery {
        margin-bottom: 1rem;
      }
      .photo-wall {
        display: flex;
        flex-wrap: wrap;
        gap: 0.75rem;
        margin-top: 0.5rem;
      }
      .photo-wall img {
        width: 96px;
        height: 96px;
        object-fit: cover;
        border-radius: 10px;
        border: 1px solid var(--border);
      }
      .schedule header {
        display: flex;
        justify-content: space-between;
        gap: 1rem;
      }
      .filters {
        display: flex;
        gap: 0.75rem;
        align-items: flex-end;
      }
      .filters label {
        display: flex;
        flex-direction: column;
        font-size: 0.85rem;
        color: #475569;
      }
      .timeline {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
        gap: 0.6rem;
        margin-top: 1rem;
      }
      .slot-chip {
        border-radius: 10px;
        border: 1px solid var(--border);
        padding: 0.75rem;
        background: #fff;
        display: flex;
        flex-direction: column;
        gap: 0.25rem;
        align-items: flex-start;
      }
      .slot-chip.free {
        background: #dcfce7;
      }
      .slot-chip.hold {
        background: #fef3c7;
      }
      .slot-chip.booked {
        background: #fee2e2;
      }
      .slot-chip.unavailable {
        background: #e2e8f0;
      }
      .slot-chip.selected {
        border-color: var(--primary);
      }
      .book-panel {
        border-left: 1px dashed var(--border);
        padding-left: 1.5rem;
      }
      @media (max-width: 900px) {
        .book-panel {
          border-left: none;
          border-top: 1px dashed var(--border);
          padding-left: 0;
          padding-top: 1rem;
        }
      }
      .checkbox {
        display: flex;
        align-items: center;
        gap: 0.35rem;
      }
      .invite-block {
        border: 1px dashed var(--border);
        border-radius: 10px;
        padding: 0.75rem;
        margin-top: 0.75rem;
      }
      .invite-row {
        display: flex;
        gap: 0.5rem;
        align-items: center;
        margin: 0.5rem 0;
      }
      .invite-row input {
        flex: 1;
      }
      .preview-row {
        display: flex;
        flex-wrap: wrap;
        gap: 0.5rem;
      }
      .preview-row img {
        width: 64px;
        height: 64px;
        object-fit: cover;
        border-radius: 8px;
        border: 1px solid var(--border);
      }
      .review-item {
        border-top: 1px solid var(--border);
        padding-top: 0.75rem;
        margin-top: 0.75rem;
      }
      .review-item header {
        display: flex;
        justify-content: space-between;
        font-weight: 600;
        margin-bottom: 0.35rem;
      }
      .review-actions {
        display: flex;
        justify-content: space-between;
        align-items: center;
        flex-wrap: wrap;
        gap: 0.5rem;
        margin-top: 0.5rem;
      }
      .selection-list {
        list-style: none;
        padding-left: 0;
        margin: 0 0 0.5rem 0;
      }
      .selection-list li {
        font-size: 0.9rem;
      }
      .upload {
        position: relative;
        overflow: hidden;
      }
      .upload input {
        position: absolute;
        inset: 0;
        opacity: 0;
        cursor: pointer;
      }
      .muted {
        color: #475569;
      }
      .muted.error {
        color: #b91c1c;
      }
    `
  ]
})
export class TurfDetailComponent implements OnInit, OnDestroy {
  private route = inject(ActivatedRoute);
  private booking = inject(BookingService);
  private reviewService = inject(ReviewService);
  private turfService = inject(TurfService);
  private auth = inject(AuthService);
  private fb = inject(FormBuilder);
  private notifications = inject(NotificationService);
  private router = inject(Router);
  private maintenance = inject(MaintenanceService);
  private directory = inject(UserDirectoryService);
  private location = inject(Location);

  readonly turfId = Number(this.route.snapshot.paramMap.get('id'));
  readonly hasValidTurfId = Number.isFinite(this.turfId);
  turf = signal<Turf | null>(null);
  selectedSlots = signal<Slot[]>([]);
  bookingMessage = signal('');
  selectedDate = signal(this.toDateInputValue(new Date()));
  refreshHandle?: ReturnType<typeof setInterval>;
  inviteDraft = '';
  invitees = signal<InviteContact[]>([]);
  inviteError = signal('');
  inviteChecking = signal(false);
  reviewImages = signal<string[]>([]);
  imageError = signal('');

  readonly cardNumberPattern = /^(?:\d{4}[- ]?){3}\d{4}$/;
  readonly upiPattern = /^[\w.\-]{2,}@[A-Za-z]{2,}$/;

  paymentForm = this.fb.nonNullable.group({
    method: ['CARD', Validators.required],
    cardNumber: ['', [Validators.pattern(this.cardNumberPattern)]],
    cardName: [''],
    upiHandle: ['', [Validators.pattern(this.upiPattern)]],
    refundable: [true]
  });

  reviewForm = this.fb.nonNullable.group({
    rating: [5, [Validators.required, Validators.min(1), Validators.max(5)]],
    body: ['']
  });

  selectedSport = signal<string | null>(null);

  readonly canBook = computed(() => !!this.auth.user());
  readonly averageRating = computed(() => (this.hasValidTurfId ? this.reviewService.average(this.turfId) : null));
  readonly eligibleToReview = computed(() => this.hasValidTurfId && this.booking.hasBookingForTurf(this.turfId));

  constructor() {
    this.applyPaymentValidators();
    this.paymentForm.get('method')!.valueChanges.subscribe(() => this.applyPaymentValidators());
  }

  ngOnInit() {
    if (!this.hasValidTurfId) {
      this.bookingMessage.set('Select a turf from the search results to see its details.');
      return;
    }
    const fromState = (window.history.state as Turf) ?? null;
    const cached = fromState?.id ? fromState : this.turfService.getFromCache(this.turfId);
    if (cached) {
      this.turf.set(cached);
      this.selectedSport.set(cached.sports?.[0] ?? null);
    }
    this.turfService.fetchOne(this.turfId).subscribe((turf) => {
      this.turf.set(turf);
      if (!this.selectedSport()) {
        this.selectedSport.set(turf.sports?.[0] ?? null);
      }
    });
    this.loadSlots();
    this.reviewService.loadForTurf(this.turfId).subscribe(() => this.prefillReviewForm());
    this.maintenance.list(this.turfId).subscribe();
    this.refreshHandle = setInterval(() => this.loadSlots(), 30000);
  }

  ngOnDestroy() {
    if (this.refreshHandle) {
      clearInterval(this.refreshHandle);
    }
  }

  loadSlots() {
    if (!this.hasValidTurfId) {
      return;
    }
    this.booking.loadSlots(this.turfId).subscribe();
  }

  onDateChange(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.value) {
      this.selectedDate.set(input.value);
      this.selectedSlots.set([]);
    }
  }

  hourlySlots(): HourBlock[] {
    const turf = this.turf();
    if (!turf) {
      return [];
    }
    const open = this.timeToMinutes(turf.openTime ?? '06:00');
    const close = this.timeToMinutes(turf.closeTime ?? '23:00');
    const date = this.selectedDate();
    const chosenSport = this.selectedSport();
    const slots = this.booking
      .slotsFor(turf.id)
      .filter((slot) => slot.startAt.startsWith(date));
    const maintenanceBlocks = this.maintenance.blocksFor(turf.id);
    const now = new Date();

    const timeline: HourBlock[] = [];
    for (let minutes = open; minutes < close; minutes += 60) {
      const start = this.buildLocalDate(date, minutes);
      const end = new Date(start.getTime() + 60 * 60 * 1000);
      const hourToken = this.hourKey(this.formatLocalIso(start));
      const match = slots.find((slot) => this.hourKey(slot.startAt) === hourToken);
      const baseSlot = match ? { ...match } : this.createVirtualSlot(turf, start, end);
      const slotSport = baseSlot.sport || chosenSport || turf.sports?.[0] || null;
      if (chosenSport && slotSport && slotSport !== chosenSport) {
        continue;
      }
      const blocked = this.isBlocked(maintenanceBlocks, start, end);
      const isPast = start.getTime() <= now.getTime();
      const status: HourBlock['status'] =
        isPast ? 'UNAVAILABLE' : blocked ? 'HOLD' : match?.status ?? 'FREE';
      timeline.push({
        label: `${start.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`,
        slot: { ...baseSlot, sport: slotSport || undefined },
        status,
        start,
        end
      });
    }
    return timeline;
  }

  toggleSlot(block: HourBlock) {
    if (!block.slot || block.status !== 'FREE') {
      return;
    }
    const current = this.selectedSlots();
    const exists = current.some((slot) => slot.id === block.slot!.id);
    if (exists) {
      this.selectedSlots.set(current.filter((slot) => slot.id !== block.slot!.id));
    } else {
      this.selectedSlots.set([...current, block.slot]);
      if (block.slot.sport) {
        this.selectedSport.set(block.slot.sport);
      }
    }
  }

  statusText(status: HourBlock['status']) {
    if (status === 'HOLD') return 'Blocked';
    if (status === 'UNAVAILABLE') return 'Unavailable';
    return status.charAt(0) + status.slice(1).toLowerCase();
  }

  isSelected(slot?: Slot | null) {
    if (!slot) {
      return false;
    }
    return this.selectedSlots().some((picked) => picked.id === slot.id);
  }

  clearSelection() {
    this.selectedSlots.set([]);
    this.bookingMessage.set('');
  }

  goBack() {
    if (typeof window !== 'undefined' && window.history.length > 1) {
      this.location.back();
      return;
    }
    if (this.router.url.startsWith('/app')) {
      this.router.navigate(['/app/turfs']);
    } else {
      this.router.navigate(['/']);
    }
  }

  book() {
    if (!this.hasValidTurfId) {
      this.bookingMessage.set('Choose a turf before booking.');
      return;
    }
    const slots = this.selectedSlots();
    if (!slots.length) {
      this.bookingMessage.set('Select at least one available slot.');
      return;
    }
    if (!this.canBook()) {
      this.bookingMessage.set('Please login to confirm bookings.');
      this.router.navigate(['/login']);
      return;
    }
    if (this.sportOptions().length > 1 && !this.selectedSport()) {
      this.bookingMessage.set('Select a sport for this booking.');
      return;
    }
    const paymentError = this.validatePaymentDetails();
    if (paymentError) {
      this.bookingMessage.set(paymentError);
      return;
    }
    if (slots.some((slot) => new Date(slot.startAt).getTime() <= Date.now())) {
      this.bookingMessage.set('One or more slots are no longer available. Refresh the list.');
      return;
    }
    forkJoin(slots.map((slot) => this.ensureRealSlot(slot)))
      .pipe(
        switchMap((realSlots) =>
          this.booking.bookSlots(
            realSlots.map((slot) => slot.id),
            !!this.paymentForm.value.refundable
          )
        )
      )
      .subscribe({
        next: (bookings) => {
          this.bookingMessage.set(`Booked ${bookings.length} slot(s). Payment simulated.`);
          this.notifications.pushLocal(`Payment captured for ${bookings.length} slot(s)`, 'PAYOUT');
          const guests = [...this.invitees()];
          if (guests.length && bookings.length) {
            this.inviteError.set('');
            const ownerBooking = bookings[0];
            guests.forEach((guest) =>
              this.booking.inviteGuest(ownerBooking.id, guest.value).subscribe({
                error: (error) => {
                  const detail =
                    error?.status === 404
                      ? 'Invitees must register before you can add them.'
                      : 'Unable to send invite right now.';
                  this.inviteError.set(detail);
                  this.notifications.pushLocal(`Invite failed for ${guest.value}`, 'INVITE');
                }
              })
            );
            this.invitees.set([]);
            this.inviteDraft = '';
          }
          this.selectedSlots.set([]);
          this.loadSlots();
        },
        error: () => this.bookingMessage.set('Unable to confirm these slots right now. Please try again.')
      });
  }

  addInvitee() {
    const raw = this.inviteDraft.trim();
    if (!raw) {
      this.inviteError.set('Enter an email or phone number.');
      return;
    }
    this.inviteError.set('');
    this.inviteChecking.set(true);
    this.directory.lookup(raw).subscribe({
      next: (user) => {
        this.inviteChecking.set(false);
        const contactValue = this.resolveContact(raw, user);
        if (!contactValue) {
          this.inviteError.set(`No registered player found for ${raw}.`);
          return;
        }
        const label = user?.fullName ? `${user.fullName} · ${contactValue}` : contactValue;
        const normalized = contactValue.toLowerCase();
        const deduped = this.invitees().filter((guest) => guest.value.toLowerCase() !== normalized);
        const entry: InviteContact = { value: contactValue, label, type: raw.includes('@') ? 'email' : 'phone' };
        this.invitees.set([entry, ...deduped]);
        this.inviteDraft = '';
        this.inviteError.set('');
      },
      error: () => {
        this.inviteChecking.set(false);
        this.inviteError.set('Unable to verify that contact right now. Please try again.');
      }
    });
  }

  removeInvitee(index: number) {
    this.invitees.set(this.invitees().filter((_, idx) => idx !== index));
  }

  onReviewImages(event: Event) {
    const input = event.target as HTMLInputElement;
    const files = input.files ? Array.from(input.files) : [];
    if (!files.length) return;
    const oversize = files.find((file) => file.size > MAX_IMAGE_BYTES);
    if (oversize) {
      this.imageError.set('One or more files exceed 2MB. Please compress them and try again.');
      input.value = '';
      return;
    }
    this.imageError.set('');
    Promise.all(files.map((file) => this.readFile(file))).then((images) => {
      this.reviewImages.set(images);
    });
  }

  submitReview() {
    if (this.reviewForm.invalid || !this.eligibleToReview()) {
      return;
    }
    const user = this.auth.user();
    if (!user) return;
    const rating = this.reviewForm.value.rating ?? 5;
    const body = this.reviewForm.value.body || '';
    const mine = this.existingReview();
    const request$ = mine
      ? this.reviewService.updateReview(this.turfId, mine.id, { rating, body })
      : this.reviewService.submitReview({
          turfId: this.turfId,
          userId: user.id,
          rating,
          body,
          images: this.reviewImages()
        });
    request$.subscribe(() => {
      this.reviewImages.set([]);
      this.prefillReviewForm();
    });
  }

  existingReview(): Review | null {
    const userId = this.auth.user()?.id;
    if (!userId || !this.hasValidTurfId) {
      return null;
    }
    return (
      this.reviewService
        .list(this.turfId)
        .find((review) => (review.user?.id ?? review.userId) === userId) ?? null
    );
  }

  private prefillReviewForm() {
    const mine = this.existingReview();
    if (mine) {
      this.reviewForm.patchValue({ rating: mine.rating, body: mine.body || '' });
    } else {
      this.reviewForm.reset({ rating: 5, body: '' });
    }
  }

  reviews() {
    return this.hasValidTurfId ? this.reviewService.list(this.turfId) : [];
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

  reviewPhotoUrl(path?: string | null) {
    if (!path) {
      return '';
    }
    if (path.startsWith('http') || path.startsWith('data:')) {
      return path;
    }
    return `${environment.fileBaseUrl}${path}`;
  }

  sportOptions() {
    return this.turf()?.sports ?? [];
  }

  onSportChange(value: string | null) {
    this.selectedSport.set(value);
    this.selectedSlots.set([]);
    this.bookingMessage.set('');
  }

  private resolveContact(raw: string, user: UserSummary | null) {
    if (!user) {
      return null;
    }
    if (raw.includes('@')) {
      return user.email && user.email.toLowerCase() === raw.toLowerCase() ? user.email : null;
    }
    const input = this.normalizeDigits(raw);
    const stored = user.phone ? this.normalizeDigits(user.phone) : '';
    if (!input || !stored || input !== stored) {
      return null;
    }
    return user.phone ?? null;
  }

  private normalizeDigits(value: string) {
    return value.replace(/\D+/g, '');
  }

  private toDateInputValue(date: Date) {
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${date.getFullYear()}-${month}-${day}`;
  }

  private buildLocalDate(dateString: string, minutes: number) {
    const [yearRaw, monthRaw, dayRaw] = dateString.split('-').map((part) => Number(part));
    const today = new Date();
    const year = Number.isFinite(yearRaw) && yearRaw ? yearRaw : today.getFullYear();
    const monthIndex = Number.isFinite(monthRaw) && monthRaw ? monthRaw - 1 : today.getMonth();
    const day = Number.isFinite(dayRaw) && dayRaw ? dayRaw : today.getDate();
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return new Date(year, monthIndex, day, hours, mins);
  }

  private formatLocalIso(date: Date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const seconds = String(date.getSeconds()).padStart(2, '0');
    return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}`;
  }

  private ensureRealSlot(slot: Slot) {
    if (!this.isVirtual(slot)) {
      return of(slot);
    }
    const turf = this.turf();
    if (!turf) {
      return of(slot);
    }
    const payload: CreateSlotPayload = {
      turfId: turf.id,
      sport: this.selectedSport() || slot.sport || turf.sports?.[0] || 'General',
      amenity: slot.amenity || turf.amenities?.[0] || 'Default',
      startAt: slot.startAt,
      endAt: slot.endAt,
      price: slot.price || turf.hourlyPrice || 0
    };
    return this.booking.createSlot(payload).pipe(
      tap((fresh) => {
        this.selectedSlots.set(
          this.selectedSlots().map((picked) => (picked.id === slot.id ? fresh : picked))
        );
        this.booking.loadSlots(turf.id).subscribe();
      })
    );
  }

  private createVirtualSlot(turf: Turf, start: Date, end: Date): Slot {
    return {
      id: -start.getTime(),
      turf,
      sport: this.selectedSport() || turf.sports?.[0],
      amenity: turf.amenities?.[0],
      startAt: this.formatLocalIso(start),
      endAt: this.formatLocalIso(end),
      price: turf.hourlyPrice || 0,
      status: 'FREE'
    };
  }

  private isVirtual(slot: Slot) {
    return slot.id < 0;
  }

  private isBlocked(blocks: MaintenanceBlock[], start: Date, end: Date) {
    return blocks.some((block) => {
      const blockStart = new Date(block.startAt);
      const blockEnd = new Date(block.endAt);
      return blockStart < end && blockEnd > start;
    });
  }

  private timeToMinutes(time: string) {
    const [hour, minute] = time.split(':').map((part) => Number(part));
    return hour * 60 + (minute || 0);
  }

  private hourKey(value: string) {
    return value.substring(0, 13);
  }

  private readFile(file: File) {
    return new Promise<string>((resolve) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.readAsDataURL(file);
    });
  }

  private applyPaymentValidators() {
    const method = this.paymentForm.value.method;
    const cardNumber = this.paymentForm.controls.cardNumber;
    const cardName = this.paymentForm.controls.cardName;
    const upiHandle = this.paymentForm.controls.upiHandle;
    if (method === 'CARD') {
      cardNumber.setValidators([Validators.required, Validators.pattern(this.cardNumberPattern)]);
      cardName.setValidators([Validators.required]);
      upiHandle.reset('', { emitEvent: false });
      upiHandle.clearValidators();
    } else {
      upiHandle.setValidators([Validators.required, Validators.pattern(this.upiPattern)]);
      cardNumber.reset('', { emitEvent: false });
      cardNumber.clearValidators();
      cardName.reset('', { emitEvent: false });
      cardName.clearValidators();
    }
    cardNumber.updateValueAndValidity({ emitEvent: false });
    cardName.updateValueAndValidity({ emitEvent: false });
    upiHandle.updateValueAndValidity({ emitEvent: false });
  }

  private validatePaymentDetails() {
    const method = this.paymentForm.value.method;
    if (method === 'CARD') {
      const number = (this.paymentForm.value.cardNumber ?? '').replace(/\s+/g, '');
      const name = (this.paymentForm.value.cardName ?? '').trim();
      if (!number) {
        return 'Enter a card number.';
      }
      if (!this.cardNumberPattern.test(number)) {
        return 'Card number must be 16 digits (with optional spaces or dashes).';
      }
      if (!name) {
        return 'Enter the name on the card.';
      }
      return null;
    }
    const upi = (this.paymentForm.value.upiHandle ?? '').trim();
    if (!upi) {
      return 'Enter your UPI handle.';
    }
    if (!this.upiPattern.test(upi)) {
      return 'UPI handle must match the format name@bank.';
    }
    return null;
  }
}
