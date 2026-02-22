import { CommonModule } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { BookingService } from '../../core/booking.service';
import { ManagerToolsService } from '../../core/manager-tools.service';
import { TurfService } from '../../core/turf.service';

@Component({
  standalone: true,
  selector: 'app-manager-tools',
  imports: [CommonModule, ReactiveFormsModule],
  template: `
    <section class="card">
      <h2>Recurring schedule builder</h2>
      <form [formGroup]="scheduleForm" (ngSubmit)="createSchedule()" class="grid grid-3">
        <label>Turf
          <select formControlName="turfId">
            <option *ngFor="let turf of turfs()" [value]="turf.id">{{ turf.name }}</option>
          </select>
        </label>
        <label>Sport <input formControlName="sport" placeholder="Football" /></label>
        <label>Amenity <input formControlName="amenity" placeholder="5v5" /></label>
        <label>Start date <input type="date" formControlName="startDate" /></label>
        <label>End date <input type="date" formControlName="endDate" /></label>
        <label>Start time <input type="time" formControlName="startTime" /></label>
        <label>Duration (minutes) <input type="number" formControlName="duration" /></label>
        <label>Price (paise) <input type="number" formControlName="price" /></label>
        <label>Repeat every (days)
          <select formControlName="intervalDays">
            <option value="1">Daily</option>
            <option value="7">Weekly</option>
          </select>
        </label>
        <button class="btn-primary" type="submit" [disabled]="scheduleForm.invalid">Create slots</button>
        <span class="tag" *ngIf="scheduleMessage()">{{ scheduleMessage() }}</span>
      </form>
    </section>

    <section class="grid grid-2">
      <article class="card">
        <h3>Promotional offers</h3>
        <form [formGroup]="offerForm" (ngSubmit)="addOffer()" class="grid grid-2">
          <label>Title <input formControlName="title" /></label>
          <label>Discount % <input type="number" formControlName="discountPercent" /></label>
          <label>Sport (optional) <input formControlName="sport" /></label>
          <label>Valid until <input type="date" formControlName="validUntil" /></label>
          <label>Description
            <textarea rows="2" formControlName="description"></textarea>
          </label>
          <button class="btn-secondary" type="submit">Save offer</button>
        </form>
        <ul>
          <li *ngFor="let offer of tools.offers()">
            <strong>{{ offer.title }}</strong> - {{ offer.discountPercent }}% off till {{ offer.validUntil }}
          </li>
        </ul>
      </article>

      <article class="card">
        <h3>Maintenance blocks</h3>
        <form [formGroup]="blockForm" (ngSubmit)="blockDate()" class="grid grid-2">
          <label>Turf ID <input type="number" formControlName="turfId" /></label>
          <label>Reason <input formControlName="reason" /></label>
          <label>Start <input type="datetime-local" formControlName="startAt" /></label>
          <label>End <input type="datetime-local" formControlName="endAt" /></label>
          <button class="btn-secondary" type="submit">Block</button>
        </form>
        <ul>
          <li *ngFor="let block of tools.maintenanceBlocks()">
            Turf #{{ block.turfId }} blocked {{ block.startAt | date: 'short' }} - {{ block.endAt | date: 'short' }} ({{ block.reason }})
          </li>
        </ul>
      </article>
    </section>

    <section class="grid grid-2">
      <article class="card">
        <h3>Invites</h3>
        <form [formGroup]="inviteForm" (ngSubmit)="sendInvite()" class="grid grid-2">
          <label>Email <input formControlName="sentTo" placeholder="player@club.com" /></label>
          <label>Turf ID <input type="number" formControlName="turfId" /></label>
          <label>Slot ID <input type="number" formControlName="slotId" /></label>
          <button class="btn-secondary" type="submit">Send</button>
        </form>
        <ul>
          <li *ngFor="let invite of tools.invites()">
            {{ invite.sentTo }} - Slot {{ invite.slotId }} ({{ invite.status }})
          </li>
        </ul>
      </article>

      <article class="card">
        <h3>Dynamic pricing rules</h3>
        <form [formGroup]="pricingForm" (ngSubmit)="addPricingRule()" class="grid grid-2">
          <label>Label <input formControlName="label" /></label>
          <label>Multiplier <input type="number" step="0.1" formControlName="multiplier" /></label>
          <label>Start hour <input type="number" formControlName="startHour" /></label>
          <label>End hour <input type="number" formControlName="endHour" /></label>
          <button class="btn-secondary" type="submit">Add rule</button>
        </form>
        <ul>
          <li *ngFor="let rule of tools.pricingRules()">
            {{ rule.label }} x{{ rule.multiplier }} from {{ rule.startHour }}h to {{ rule.endHour }}h
          </li>
        </ul>
      </article>
    </section>

    <section class="grid grid-2">
      <article class="card">
        <h3>Extension approvals</h3>
        <p>Approve or decline live extension requests.</p>
        <ng-container *ngIf="extensions().length; else noExtensions">
          <table class="table">
            <tr *ngFor="let req of extensions()">
              <td>
                <strong>#{{ req.bookingId }}</strong>
                <div class="muted">{{ req.turfName || 'Turf' }}</div>
                <div class="muted">
                  {{ req.startAt | date: 'shortTime' }} â†’ {{ req.endAt | date: 'shortTime' }}
                </div>
              </td>
              <td>
                {{ req.requestedBy?.fullName || (req.requestedBy?.id ? ('Player #' + req.requestedBy?.id) : 'Player') }}<br />
                <small class="muted">+{{ req.minutes }}m</small>
              </td>
              <td><span class="tag">{{ req.status }}</span></td>
              <td>
                <button
                  class="btn-secondary"
                  type="button"
                  (click)="handleExtension(req.id, 'APPROVED')"
                  [disabled]="req.status !== 'PENDING'"
                >
                  Approve
                </button>
                <button
                  class="btn-secondary"
                  type="button"
                  (click)="handleExtension(req.id, 'DECLINED')"
                  [disabled]="req.status !== 'PENDING'"
                >
                  Decline
                </button>
              </td>
            </tr>
          </table>
        </ng-container>
        <ng-template #noExtensions>
          <p class="muted">No pending extension requests.</p>
        </ng-template>
      </article>

      <article class="card">
        <h3>Reports & payouts</h3>
        <p>Occupancy {{ occupancy() }}% � Revenue INR {{ revenue() }}</p>
        <ul>
          <li *ngFor="let payout of tools.payouts()">
            {{ payout.period }} - INR {{ payout.amount }} ({{ payout.released ? 'Released' : 'Pending' }})
          </li>
        </ul>
      </article>
    </section>
  `,
  styles: [
    `
      form {
        gap: 0.75rem;
      }
      ul {
        list-style: none;
        padding: 0;
      }
      li {
        padding: 0.35rem 0;
        border-bottom: 1px solid var(--border);
      }
    `
  ]
})
export class ManagerToolsComponent {
  private fb = inject(FormBuilder);
  private booking = inject(BookingService);
  readonly tools = inject(ManagerToolsService);
  private turfsSvc = inject(TurfService);

  turfs = computed(() => this.turfsSvc.managedTurfs());
  scheduleMessage = signal('');

  constructor() {
    this.turfsSvc.loadMine().subscribe();
  }

  scheduleForm = this.fb.nonNullable.group({
    turfId: [0, Validators.required],
    sport: ['', Validators.required],
    amenity: ['', Validators.required],
    startDate: ['', Validators.required],
    endDate: ['', Validators.required],
    startTime: ['', Validators.required],
    duration: [60, Validators.required],
    price: [2500, Validators.required],
    intervalDays: [1, Validators.required]
  });

  offerForm = this.fb.nonNullable.group({
    title: ['', Validators.required],
    discountPercent: [10, Validators.required],
    sport: [''],
    description: [''],
    validUntil: ['', Validators.required]
  });

  blockForm = this.fb.nonNullable.group({
    turfId: [0, Validators.required],
    reason: ['', Validators.required],
    startAt: ['', Validators.required],
    endAt: ['', Validators.required]
  });

  inviteForm = this.fb.nonNullable.group({
    sentTo: ['', Validators.required],
    turfId: [0, Validators.required],
    slotId: [0, Validators.required]
  });

  pricingForm = this.fb.nonNullable.group({
    label: ['', Validators.required],
    multiplier: [1.2, Validators.required],
    startHour: [18, Validators.required],
    endHour: [22, Validators.required]
  });

  createSchedule() {
    if (this.scheduleForm.invalid) return;
    const value = this.scheduleForm.getRawValue();
    const turfId = Number(value.turfId);
    const interval = Number(value.intervalDays) || 1;
    const starts = new Date(`${value.startDate}T${value.startTime}`);
    const endDate = new Date(`${value.endDate}T23:59`);
    const created: Promise<void>[] = [];
    for (let date = new Date(starts); date <= endDate; date.setDate(date.getDate() + interval)) {
      const startAt = new Date(date);
      const endAt = new Date(startAt.getTime() + Number(value.duration) * 60000);
      const payload = {
        turfId,
        sport: value.sport,
        amenity: value.amenity,
        startAt: startAt.toISOString(),
        endAt: endAt.toISOString(),
        price: Number(value.price)
      };
      created.push(
        new Promise((resolve) => {
          this.booking.createSlot(payload).subscribe(() => resolve());
        })
      );
    }
    Promise.all(created).then(() => {
      this.scheduleMessage.set('Slots created and pending booking.');
      this.booking.loadSlots(turfId).subscribe();
    });
  }

  addOffer() {
    if (this.offerForm.invalid) return;
    this.tools.addOffer(this.offerForm.getRawValue());
    this.offerForm.reset({ discountPercent: 10 });
  }

  blockDate() {
    if (this.blockForm.invalid) return;
    const value = this.blockForm.getRawValue();
    this.tools.blockMaintenance({
      turfId: Number(value.turfId),
      reason: value.reason,
      startAt: value.startAt,
      endAt: value.endAt
    });
    this.blockForm.reset();
  }

  sendInvite() {
    if (this.inviteForm.invalid) return;
    const value = this.inviteForm.getRawValue();
    this.tools.sendInvite({
      sentTo: value.sentTo,
      turfId: Number(value.turfId),
      slotId: Number(value.slotId)
    });
    this.inviteForm.reset();
  }

  addPricingRule() {
    if (this.pricingForm.invalid) return;
    const value = this.pricingForm.getRawValue();
    this.tools.addPricingRule({
      label: value.label,
      multiplier: Number(value.multiplier),
      days: [],
      startHour: Number(value.startHour),
      endHour: Number(value.endHour)
    });
    this.pricingForm.reset({ multiplier: 1.2, startHour: 18, endHour: 22 });
  }

  extensions() {
    return this.booking.managedExtensions();
  }

  handleExtension(id: number, decision: 'APPROVED' | 'DECLINED') {
    this.booking.handleExtension(id, decision).subscribe();
  }

  occupancy() {
    const bookings = this.booking.myBookings();
    const approved = bookings.filter((b) => b.status === 'CONFIRMED').length;
    const total = Math.max(bookings.length, 1);
    return Math.round((approved / total) * 100);
  }

  revenue() {
    const sum = this.booking.myBookings().reduce((acc, b) => acc + b.priceCents, 0);
    return (sum / 100).toFixed(0);
  }
}

