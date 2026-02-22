import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { NotificationService } from '../../core/notification.service';
import { ManagerToolsService } from '../../core/manager-tools.service';
import { AuthService } from '../../core/auth.service';

@Component({
  standalone: true,
  selector: 'app-notification-center',
  imports: [CommonModule],
  template: `
    <section class="card">
      <header class="section-head">
        <h2>Notifications</h2>
        <button class="btn-secondary" (click)="notifications.clearAll()">Clear</button>
      </header>
      <ul>
        <li *ngFor="let note of notifications.notifications()">
          <div>
            <strong>{{ note.type }}</strong> - {{ note.message }}
          </div>
          <small>{{ note.createdAt | date: 'short' }}</small>
          <button class="btn-secondary" (click)="notifications.markRead(note.id)" *ngIf="!note.read">Mark read</button>
        </li>
      </ul>
    </section>

    <section class="card" *ngIf="auditFeed().length">
      <header class="section-head">
        <h2>Audit log</h2>
        <small class="muted">Events triggered by you</small>
      </header>
      <ul>
        <li *ngFor="let event of auditFeed()">
          <div>
            <strong>{{ event.action }}</strong>
            <span *ngIf="event.target"> — {{ event.target }}</span>
          </div>
          <small>{{ event.createdAt | date: 'short' }}</small>
        </li>
      </ul>
    </section>
  `,
  styles: [
    `
      ul {
        list-style: none;
        padding: 0;
      }
      li {
        padding: 0.75rem 0;
        border-bottom: 1px solid var(--border);
        display: flex;
        justify-content: space-between;
        align-items: center;
        flex-wrap: wrap;
        gap: 0.5rem;
      }
      .muted {
        color: #475569;
      }
    `
  ]
})
export class NotificationCenterComponent {
  notifications = inject(NotificationService);
  private manager = inject(ManagerToolsService);
  private auth = inject(AuthService);

  auditFeed() {
    const current = this.auth.user();
    if (!current) {
      return [];
    }
    const identifiers = [current.fullName, current.email].filter(Boolean);
    return this.manager
      .auditTrail()
      .filter((event) => identifiers.includes(event.actor))
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }
}
