import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AuthService } from '../../core/auth.service';
import { NotificationService } from '../../core/notification.service';
import { SupportService } from '../../core/support.service';
import { UserRole } from '../../models/api.models';

interface NavLink {
  label: string;
  path: string;
  roles?: UserRole[];
}

@Component({
  standalone: true,
  selector: 'app-shell',
  imports: [CommonModule, RouterOutlet, RouterLink, RouterLinkActive],
  template: `
    <div class="layout">
      <header>
        <div class="brand">
          <a class="brand-link" href="/" (click)="goHome($event)">TurfOS</a>
          <span class="tag" *ngIf="user()?.role">{{ user()?.role }}</span>
        </div>
        <nav>
          <a
            *ngFor="let link of visibleLinks()"
            [routerLink]="link.path"
            routerLinkActive="active"
            [routerLinkActiveOptions]="{ exact: link.path === '/app/turfs' }"
            >{{ link.label }}</a
          >
        </nav>
        <div class="profile">
          <div>
            <small>{{ user()?.email }}</small>
            <div>{{ user()?.fullName }}</div>
          </div>
          <button class="btn-secondary" [routerLink]="['/app/profile']">
            Profile
          </button>
          <button class="btn-secondary" [routerLink]="['/app/notifications']">
            Notifications ({{ unreadCount() }})
          </button>
          <button class="btn-secondary" [routerLink]="['/app/support']">
            Tickets ({{ supportCount() }})
          </button>
          <button class="btn-primary" (click)="logout()">Logout</button>
        </div>
      </header>

      <main>
        <router-outlet />
      </main>
    </div>
  `,
  styles: [
    `
      .layout {
        min-height: 100vh;
      }
      header {
        position: sticky;
        top: 0;
        z-index: 10;
        display: flex;
        flex-wrap: wrap;
        gap: 1rem;
        align-items: center;
        justify-content: space-between;
        padding: 1rem 1.5rem;
        background: white;
        border-bottom: 1px solid var(--border);
      }
      nav {
        display: flex;
        flex-wrap: wrap;
        gap: 0.75rem;
      }
      nav a {
        text-decoration: none;
        color: var(--text);
        padding: 0.35rem 0.5rem;
        border-radius: 6px;
      }
      nav a.active {
        background: var(--primary);
        color: white;
      }
      .profile {
        display: flex;
        flex-wrap: wrap;
        align-items: center;
        gap: 0.5rem;
      }
      .brand-link {
        text-decoration: none;
        color: var(--text);
        font-weight: 700;
        font-size: 1.1rem;
      }
      .brand-link:hover {
        color: var(--primary);
      }
      main {
        padding: 1.5rem;
      }
    `
  ]
})
export class ShellComponent implements OnInit {
  private auth = inject(AuthService);
  private notifications = inject(NotificationService);
  private support = inject(SupportService);
  private router = inject(Router);

  readonly user = this.auth.user;

  links: NavLink[] = [
    { label: 'Find Turf', path: '/app/turfs' },
    { label: 'My Bookings', path: '/app/bookings' },
    { label: 'Manage Turf', path: '/app/turfs/manage' },
    { label: 'Admin', path: '/app/admin/moderation', roles: ['ADMIN'] }
  ];

  ngOnInit() {
    this.notifications.loadMine().subscribe();
    this.support.loadMine().subscribe();
  }

  visibleLinks() {
    return this.links.filter((link) => !link.roles || this.auth.hasRole(link.roles));
  }

  unreadCount() {
    return this.notifications.notifications().filter((n) => !n.read).length;
  }

  supportCount() {
    return this.support.tickets().filter((t) => t.status !== 'RESOLVED').length;
  }

  logout() {
    this.auth.logout();
  }

  goHome(event?: Event) {
    event?.preventDefault();
    this.router.navigateByUrl('/');
  }
}
