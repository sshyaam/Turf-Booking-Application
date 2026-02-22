import { CommonModule } from '@angular/common';
import { Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../core/auth.service';
import { BookingService } from '../../core/booking.service';
import { NotificationService } from '../../core/notification.service';
import { SupportService } from '../../core/support.service';
import { ManagerToolsService } from '../../core/manager-tools.service';

@Component({
  standalone: true,
  selector: 'app-dashboard',
  imports: [CommonModule, RouterLink],
  template: `
    <div class="grid grid-3">
      <div class="card" *ngFor="let metric of metrics()">
        <p class="muted">{{ metric.label }}</p>
        <h2>{{ metric.value }}</h2>
        <small>{{ metric.helper }}</small>
      </div>
    </div>

    <section class="grid grid-2">
      <div class="card">
        <header class="section-head">
          <h3>Upcoming sessions</h3>
          <span class="tag" *ngIf="upcoming().length === 0">No future bookings yet</span>
        </header>
        <div *ngFor="let booking of upcoming()">
          <strong>{{ booking.turf.name }}</strong>
          <div>
            {{ booking.slot.startAt | date: 'medium' }} ? {{ booking.slot.endAt | date: 'shortTime' }}
          </div>
          <div>
            Status <span class="tag" [ngClass]="'status-' + booking.slot.status.toLowerCase()">{{ booking.status }}</span>
          </div>
        </div>
      </div>

      <div class="card">
        <header class="section-head">
          <h3>Notifications</h3>
          <a routerLink="/notifications">View all</a>
        </header>
        <ul>
          <li *ngFor="let note of notifications() | slice: 0:5">
            <div>{{ note.message }}</div>
            <small>{{ note.createdAt | date: 'short' }}</small>
          </li>
        </ul>
      </div>
    </section>

    <section class="grid grid-2">
      <div class="card">
        <header class="section-head">
          <h3>Support tickets</h3>
          <a routerLink="/support">Raise new</a>
        </header>
        <table class="table" *ngIf="tickets().length; else noTickets">
          <thead>
            <tr>
              <th>Title</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            <tr *ngFor="let ticket of tickets()">
              <td>{{ ticket.title }}</td>
              <td><span class="tag">{{ ticket.status }}</span></td>
            </tr>
          </tbody>
        </table>
        <ng-template #noTickets>
          <p class="muted">No open tickets.</p>
        </ng-template>
      </div>

      <div class="card">
        <header class="section-head">
          <h3>Audit log</h3>
          <a routerLink="/admin/moderation">Moderate</a>
        </header>
        <ul>
          <li *ngFor="let item of auditTrail() | slice: 0:6">
            <div>{{ item.action }} <small *ngIf="item.target">? {{ item.target }}</small></div>
            <small>{{ item.createdAt | date: 'short' }}</small>
          </li>
        </ul>
      </div>
    </section>
  `,
  styles: [
    `
      .section-head {
        display: flex;
        align-items: center;
        justify-content: space-between;
        margin-bottom: 1rem;
      }
      ul {
        list-style: none;
        padding: 0;
      }
      li {
        padding: 0.5rem 0;
        border-bottom: 1px solid var(--border);
      }
      .muted {
        color: #475569;
      }
    `
  ]
})
export class DashboardComponent {
  private auth = inject(AuthService);
  private booking = inject(BookingService);
  private notificationsSvc = inject(NotificationService);
  private supportSvc = inject(SupportService);
  private manager = inject(ManagerToolsService);

  readonly notifications = this.notificationsSvc.notifications;
  readonly tickets = this.supportSvc.tickets;
  readonly auditTrail = this.manager.auditTrail;

  metrics = computed(() => {
    const bookings = this.booking.myBookings();
    const confirmed = bookings.filter((b) => b.status === 'CONFIRMED').length;
    const cancelled = bookings.filter((b) => b.status === 'CANCELLED').length;
    const upcoming = bookings.filter((b) => new Date(b.slot.startAt) > new Date()).length;
    const payouts = this.manager.payouts();
    return [
      { label: 'Confirmed', value: String(confirmed), helper: 'Lifetime bookings' },
      { label: 'Upcoming', value: String(upcoming), helper: 'Future calendar slots' },
      { label: 'Cancelled', value: String(cancelled), helper: 'With refund logic applied' },
      {
        label: 'Payout pipeline',
        value: payouts.length ? `?${(payouts[0].amount / 100).toFixed(0)}k` : '?0',
        helper: payouts[0]?.period ?? 'No payouts scheduled'
      }
    ];
  });

  upcoming = computed(() =>
    this.booking
      .myBookings()
      .filter((b) => new Date(b.slot.startAt) > new Date())
      .sort((a, b) => a.slot.startAt.localeCompare(b.slot.startAt))
  );
}
