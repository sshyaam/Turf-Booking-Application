import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { catchError, tap } from 'rxjs';
import { environment } from '../../environments/environment';
import { SupportTicket } from '../models/api.models';

@Injectable({ providedIn: 'root' })
export class SupportService {
  private http = inject(HttpClient);
  private ticketsSignal = signal<SupportTicket[]>([]);

  readonly tickets = this.ticketsSignal.asReadonly();

  loadMine() {
    return this.http
      .get<SupportTicket[]>(`${environment.apiUrl}/support/tickets/me`)
      .pipe(tap((tickets) => this.ticketsSignal.set(tickets)));
  }

  loadQueueForAdmin() {
    return this.http
      .get<SupportTicket[]>(`${environment.apiUrl}/support/tickets`)
      .pipe(
        tap((tickets) => this.ticketsSignal.set(tickets)),
        catchError((error) => {
          console.warn('Falling back to personal tickets', error);
          return this.loadMine();
        })
      );
  }

  createTicket(payload: { title: string; description: string; bookingId?: number }) {
    return this.http
      .post<SupportTicket>(`${environment.apiUrl}/support/tickets`, payload)
      .pipe(tap((ticket) => this.ticketsSignal.set([ticket, ...this.ticketsSignal()])));
  }

  respond(id: number, responseText: string, status: SupportTicket['status']) {
    const params = new URLSearchParams({ responseText, status });
    return this.http
      .post<SupportTicket>(
        `${environment.apiUrl}/support/tickets/${id}/respond?${params.toString()}`,
        {}
      )
      .pipe(
        tap((ticket) =>
          this.ticketsSignal.set(
            this.ticketsSignal().map((t) => (t.id === ticket.id ? ticket : t))
          )
        )
      );
  }
}
