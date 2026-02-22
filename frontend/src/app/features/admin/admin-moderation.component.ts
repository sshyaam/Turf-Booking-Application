import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { TurfService } from '../../core/turf.service';
import { ManagerToolsService } from '../../core/manager-tools.service';
import { Turf } from '../../models/api.models';

@Component({
  standalone: true,
  selector: 'app-admin-moderation',
  imports: [CommonModule],
  template: `
    <section class="card">
      <h2>Pending turfs</h2>
      <div class="pending-grid">
        <table class="table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Name</th>
              <th>City</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            <tr *ngFor="let turf of pending()" (click)="open(turf.id)" class="clickable">
              <td>#{{ turf.id }}</td>
              <td>{{ turf.name }}</td>
              <td>{{ turf.city }}</td>
              <td>{{ turf.status }}</td>
            </tr>
          </tbody>
        </table>
        <article class="card detail" *ngIf="selectedTurf()">
          <header class="section-head">
            <div>
              <h3>{{ selectedTurf()?.name }}</h3>
              <p class="muted">{{ selectedTurf()?.city }}, {{ selectedTurf()?.state }} {{ selectedTurf()?.pincode }}</p>
            </div>
            <div class="chip-row">
              <span class="chip">Base ₹{{ (selectedTurf()?.hourlyPrice || 0) / 100 }}</span>
              <span class="chip">Managers: {{ selectedTurf()?.managers.length || 1 }}</span>
            </div>
          </header>
          <p>Sports: {{ selectedTurf()?.sports?.join(', ') || 'Not listed' }}</p>
          <p>Amenities: {{ selectedTurf()?.amenities?.join(', ') || 'Not listed' }}</p>
          <div class="chip-row" *ngIf="customPricingList().length">
            <span class="chip" *ngFor="let entry of customPricingList()"> {{ entry.day }} – ₹{{ entry.price / 100 }} </span>
          </div>
          <div class="actions">
            <button class="btn-primary" (click)="approve(selectedTurf()!.id)">Approve</button>
            <button class="btn-secondary" (click)="reject(selectedTurf()!.id)">Reject</button>
          </div>
        </article>
      </div>
    </section>

    <section class="card">
      <h3>Managers & turfs</h3>
      <ul>
        <li *ngFor="let group of managerGroups()">
          <strong>{{ group.manager }}</strong> — {{ group.turfs.join(', ') }}
        </li>
      </ul>
    </section>

    <section class="card">
      <h3>Audit log</h3>
      <ul>
        <li *ngFor="let event of tools.auditTrail()">
          {{ event.createdAt | date: 'short' }} - {{ event.action }} {{ event.target || '' }}
        </li>
      </ul>
    </section>
  `,
  styles: [
    `
      .pending-grid {
        display: grid;
        grid-template-columns: 2fr 1fr;
        gap: 1rem;
      }
      .detail {
        margin: 0;
      }
      .chip-row {
        display: flex;
        gap: 0.5rem;
        flex-wrap: wrap;
      }
      .chip {
        background: #e2e8f0;
        border-radius: 999px;
        padding: 0.25rem 0.75rem;
      }
      .clickable {
        cursor: pointer;
      }
      ul {
        list-style: none;
        padding: 0;
      }
      li {
        padding: 0.35rem 0;
        border-bottom: 1px solid var(--border);
      }
      .actions {
        display: flex;
        gap: 0.5rem;
      }
      @media (max-width: 900px) {
        .pending-grid {
          grid-template-columns: 1fr;
        }
      }
    `
  ]
})
export class AdminModerationComponent implements OnInit {
  private turfs = inject(TurfService);
  tools = inject(ManagerToolsService);
  selectedTurf = signal<Turf | null>(null);

  ngOnInit() {
    this.turfs.loadAll(50).subscribe();
    this.turfs.loadManagedForAdmin().subscribe();
  }

  pending() {
    return this.turfs.pendingTurfs();
  }

  open(id: number) {
    const cached = this.turfs.getFromCache(id);
    if (cached) {
      this.selectedTurf.set(cached);
      return;
    }
    this.turfs.fetchOne(id).subscribe((turf) => this.selectedTurf.set(turf));
  }

  customPricingList() {
    const turf = this.selectedTurf();
    if (!turf?.customPricing) {
      return [];
    }
    return Object.entries(turf.customPricing).map(([day, price]) => ({ day, price }));
  }

  approve(id: number) {
    this.turfs.approveTurf(id).subscribe((turf) => this.selectedTurf.set(turf));
  }

  reject(id: number) {
    this.turfs.rejectTurf(id).subscribe((turf) => this.selectedTurf.set(turf));
  }

  managerGroups() {
    const all = this.turfs.listCached();
    const map = new Map<string, Set<string>>();
    all.forEach((turf) => {
      turf.managers?.forEach((manager) => {
        const key = manager.fullName;
        if (!map.has(key)) {
          map.set(key, new Set());
        }
        map.get(key)!.add(turf.name);
      });
    });
    return Array.from(map.entries()).map(([manager, turfs]) => ({
      manager,
      turfs: Array.from(turfs)
    }));
  }
}
