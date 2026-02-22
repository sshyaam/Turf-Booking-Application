import { CommonModule } from '@angular/common';
import { Component, OnInit, computed, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators, FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { SupportService } from '../../core/support.service';
import { AuthService } from '../../core/auth.service';
import { SupportTicket } from '../../models/api.models';

@Component({
  standalone: true,
  selector: 'app-support-center',
  imports: [CommonModule, ReactiveFormsModule, FormsModule],
  template: `
    <section class="card" *ngIf="!adminMode()">
      <button class="back-button" type="button" (click)="goBack()">&larr; Back</button>
      <h2>Raise a support ticket</h2>
      <form [formGroup]="ticketForm" (ngSubmit)="submit()" class="grid grid-2">
        <label>Title <input formControlName="title" /></label>
        <label>Booking ID (optional) <input type="number" formControlName="bookingId" /></label>
        <label>Description
          <textarea rows="3" formControlName="description"></textarea>
        </label>
        <button class="btn-primary" type="submit">Submit</button>
      </form>
    </section>

    <section class="card">
      <button class="back-button" type="button" (click)="goBack()">&larr; Back</button>
      <h3>{{ adminMode() ? 'Ticket queue' : 'My tickets' }}</h3>
      <table class="table">
        <thead>
          <tr>
            <th>ID</th>
            <th>Title</th>
            <th *ngIf="adminMode()">Player</th>
            <th>Status</th>
            <th>Admin response</th>
            <th *ngIf="adminMode()">Resolve</th>
          </tr>
        </thead>
        <tbody>
          <tr *ngFor="let ticket of tickets()">
            <td>#{{ ticket.id }}</td>
            <td>{{ ticket.title }}</td>
            <td *ngIf="adminMode()">
              {{ ticket.user?.fullName || 'Unknown player' }}<br />
              <small class="muted">{{ ticket.user?.email || ticket.user?.phone || '—' }}</small>
            </td>
            <td><span class="tag">{{ ticket.status }}</span></td>
            <td>{{ ticket.adminResponse || 'Pending' }}</td>
            <td *ngIf="adminMode()">
              <ng-container *ngIf="ensureDraft(ticket.id)">
                <textarea
                  rows="2"
                  [(ngModel)]="responseDrafts[ticket.id].text"
                  [ngModelOptions]="{ standalone: true }"
                ></textarea>
                <select
                  [(ngModel)]="responseDrafts[ticket.id].status"
                  [ngModelOptions]="{ standalone: true }"
                >
                  <option *ngFor="let status of statuses" [value]="status">{{ status }}</option>
                </select>
                <button class="btn-secondary" type="button" (click)="respond(ticket.id)">Send</button>
              </ng-container>
            </td>
          </tr>
        </tbody>
      </table>
    </section>
  `
})
export class SupportCenterComponent implements OnInit {
  private fb = inject(FormBuilder);
  private support = inject(SupportService);
  private auth = inject(AuthService);
  private router = inject(Router);

  readonly adminMode = computed(() => this.auth.hasRole(['ADMIN']));
  readonly statuses: SupportTicket['status'][] = ['OPEN', 'IN_PROGRESS', 'RESOLVED'];
  responseDrafts: Record<number, { text: string; status: SupportTicket['status'] }> = {};

  ticketForm = this.fb.nonNullable.group({
    title: ['', Validators.required],
    bookingId: [null],
    description: ['', Validators.required]
  });

  tickets = this.support.tickets;

  ngOnInit() {
    const loader = this.adminMode() ? this.support.loadQueueForAdmin() : this.support.loadMine();
    loader.subscribe();
  }

  submit() {
    if (this.adminMode() || this.ticketForm.invalid) return;
    const value = this.ticketForm.getRawValue();
    const payload = {
      title: value.title,
      description: value.description,
      bookingId: value.bookingId ?? undefined
    };
    this.support.createTicket(payload).subscribe(() => {
      this.ticketForm.reset({ bookingId: null });
    });
  }

  ensureDraft(id: number) {
    if (!this.responseDrafts[id]) {
      this.responseDrafts[id] = { text: '', status: 'IN_PROGRESS' };
    }
    return true;
  }

  respond(id: number) {
    if (!this.adminMode()) {
      return;
    }
    const draft = this.responseDrafts[id];
    if (!draft || !draft.text.trim()) {
      return;
    }
    this.support.respond(id, draft.text, draft.status).subscribe(() => {
      this.responseDrafts[id] = { text: '', status: draft.status };
    });
  }

  goBack() {
    this.router.navigate(['/app/turfs']);
  }
}
