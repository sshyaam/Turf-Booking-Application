import { CommonModule } from '@angular/common';
import { Component, effect, inject } from '@angular/core';
import { Router } from '@angular/router';
import { BookingService } from '../../core/booking.service';
import { Booking } from '../../models/api.models';

@Component({
  standalone: true,
  selector: 'app-booking-center',
  imports: [CommonModule],
  template: `
    <section class="card">
      <button class="back-button" type="button" (click)="goBack()">&larr; Back</button>
      <header class="section-head">
        <div>
          <h2>My bookings</h2>
          <small>{{ bookings().length }} total across all turfs</small>
        </div>
      </header>
      <table class="table" *ngIf="bookings().length; else empty">
        <thead>
          <tr>
            <th>ID</th>
            <th>Turf</th>
            <th>Slot</th>
            <th>Status</th>
            <th>Payment</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          <tr *ngFor="let booking of bookings()">
            <td>#{{ booking.id }}</td>
            <td>{{ booking.turf.name }}</td>
            <td>
              {{ (booking.startAt || booking.slot.startAt) | date: 'short' }}
              &rarr;
              {{ (booking.endAt || booking.slot.endAt) | date: 'shortTime' }}<br />
              {{ booking.slot?.sport || 'Any' }} / {{ booking.slot?.amenity || 'N/A' }}
              <small class="muted" *ngIf="booking.slotCount && booking.slotCount > 1">
                ({{ booking.slotCount }} slots)
              </small>
            </td>
            <td><span class="tag">{{ booking.status }}</span></td>
            <td>{{ booking.paymentStatus }}</td>
            <td>
              <ng-container *ngIf="showActions(booking); else readOnly">
                <div class="action-col">
                  <button class="btn-secondary" (click)="cancel(booking.id)">
                    Cancel
                  </button>
                  <button class="btn-secondary" type="button" (click)="requestExtension(booking)" [disabled]="!canExtend(booking)">
                    Request +1h
                  </button>
                </div>
              </ng-container>
              <ng-template #readOnly>
                <small class="muted">Managed by owner</small>
              </ng-template>
            </td>
          </tr>
        </tbody>
      </table>
      <ng-template #empty>
        <p class="muted">No bookings yet. Go to Find Turf to start.</p>
      </ng-template>
    </section>

    <section class="card" *ngIf="invites().length">
      <h3>Pending invites</h3>
      <ul>
        <li *ngFor="let invite of invites()">
          {{ invite.contact }} invited you to booking #{{ invite.bookingId }}
          <button class="btn-secondary" type="button" (click)="accept(invite.id)">Accept</button>
        </li>
      </ul>
    </section>

    <section class="card" *ngIf="myExtensions().length">
      <h3>Extension requests</h3>
      <ul>
        <li *ngFor="let req of myExtensions()">
          Booking #{{ req.bookingId }} ({{ req.turfName || 'Turf' }}) - +{{ req.minutes }}m -
          <strong>{{ req.status }}</strong>
        </li>
      </ul>
    </section>

    <section class="card">
      <h3>Refund policy</h3>
      <p>We automatically issue 100% refunds if you cancel more than 24 hours before the slot starts and 50% otherwise.</p>
      <ul>
        <li>Cancelled bookings trigger dashboard notifications instantly.</li>
        <li>Refund status mirrors the backend enum (REFUNDED vs PARTIAL_REFUND).</li>
      </ul>
    </section>
  `,
  styles: [
    `
      .muted {
        color: #475569;
      }
      .action-col {
        display: flex;
        flex-direction: column;
        gap: 0.4rem;
      }
    `
  ]
})
export class BookingCenterComponent {
  private booking = inject(BookingService);
  private router = inject(Router);
  bookings = this.booking.myBookings;
  myExtensions = this.booking.myExtensions;
  invites = this.booking.invites;
  private loadedTurfIds = new Set<number>();

  constructor() {
    effect(() => {
      const list = this.bookings();
      list.forEach((booking) => {
        const turfId = booking.turf.id;
        if (this.loadedTurfIds.has(turfId)) {
          return;
        }
        this.loadedTurfIds.add(turfId);
        this.booking.loadSlots(turfId).subscribe();
      });
    });
  }

  cancel(id: number) {
    this.booking.cancelBooking(id).subscribe();
  }

  canExtend(booking: Booking) {
    return this.booking.canExtend(booking);
  }

  requestExtension(booking: Booking) {
    const request$ = this.booking.requestExtension(booking, 60);
    if (!request$) {
      return;
    }
    request$.subscribe();
  }

  showActions(booking: Booking) {
    return booking.role !== 'GUEST' && booking.status === 'CONFIRMED';
  }

  accept(id: number) {
    this.booking.acceptInvite(id).subscribe();
  }

  goBack() {
    this.router.navigate(['/app/turfs']);
  }
}
