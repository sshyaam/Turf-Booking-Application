import { Injectable, effect, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of, tap } from 'rxjs';
import { environment } from '../../environments/environment';
import {
  Booking,
  BookingExtensionRequest,
  BookingInvite,
  BookingSummary,
  BookingTransaction,
  Slot
} from '../models/api.models';
import { AuthService } from './auth.service';
import { NotificationService } from './notification.service';

export interface CreateSlotPayload {
  turfId: number;
  sport?: string;
  amenity?: string;
  startAt: string;
  endAt: string;
  price: number;
}

@Injectable({ providedIn: 'root' })
export class BookingService {
  private http = inject(HttpClient);
  private auth = inject(AuthService);
  private notifications = inject(NotificationService);

  private slotsByTurf = signal<Record<number, Slot[]>>({});
  private bookingsSignal = signal<Booking[]>([]);
  private myExtensionsSignal = signal<BookingExtensionRequest[]>([]);
  private managedExtensionsSignal = signal<BookingExtensionRequest[]>([]);
  private adminBookings = signal<Record<number, BookingSummary[]>>({});
  private invitesSignal = signal<BookingInvite[]>([]);
  private transactionsSignal = signal<Record<number, BookingTransaction[]>>({});

  readonly myBookings = this.bookingsSignal.asReadonly();
  readonly myExtensions = this.myExtensionsSignal.asReadonly();
  readonly managedExtensions = this.managedExtensionsSignal.asReadonly();
  readonly invites = this.invitesSignal.asReadonly();

  constructor() {
    effect(() => {
      const user = this.auth.user();
      if (!user) {
        this.bookingsSignal.set([]);
        this.invitesSignal.set([]);
        this.transactionsSignal.set({});
        this.adminBookings.set({});
        this.myExtensionsSignal.set([]);
        this.managedExtensionsSignal.set([]);
        return;
      }
      const stored = localStorage.getItem(this.storageKey(user.id));
      this.bookingsSignal.set(stored ? (JSON.parse(stored) as Booking[]) : []);
      this.syncFromServer();
      this.loadInvites();
      this.loadMyExtensions().subscribe();
      if (this.canManageExtensions(user)) {
        this.loadManagedExtensions().subscribe();
      } else {
        this.managedExtensionsSignal.set([]);
      }
    });

    effect(() => {
      const user = this.auth.user();
      const bookings = this.bookingsSignal();
      if (user) {
        localStorage.setItem(this.storageKey(user.id), JSON.stringify(bookings));
      }
    });
  }

  loadSlots(turfId: number) {
    return this.http
      .get<Slot[]>(`${environment.apiUrl}/bookings/slots/${turfId}`)
      .pipe(tap((slots) => this.updateSlots(turfId, slots)));
  }

  slotsFor(turfId: number) {
    return this.slotsByTurf()[turfId] ?? [];
  }

  bookSlots(slotIds: number[], refundable: boolean) {
    return this.http
      .post<Booking[]>(`${environment.apiUrl}/bookings/book`, { slotIds, refundable })
      .pipe(
        tap((bookings) => {
          this.bookingsSignal.set([...bookings, ...this.bookingsSignal()]);
          bookings.forEach((booking) => {
            this.notifications.pushLocal(`Booking #${booking.id} confirmed`, 'BOOKING');
            const slots = this.slotsByTurf()[booking.turf.id] ?? [];
            const updated = slots.map<Slot>((s) =>
              slotIds.includes(s.id) ? { ...s, status: 'BOOKED' as Slot['status'] } : s
            );
            this.updateSlots(booking.turf.id, updated);
          });
          this.syncFromServer();
        })
      );
  }

  cancelBooking(bookingId: number) {
    return this.http
      .post<Booking>(`${environment.apiUrl}/bookings/cancel`, { bookingId })
      .pipe(
        tap((booking) => {
          this.bookingsSignal.set(
            this.bookingsSignal().map((b) => (b.id === booking.id ? booking : b))
          );
          this.notifications.pushLocal(`Booking #${booking.id} cancelled`, 'REFUND');
          const turfId = booking.turf.id;
          const slots = this.slotsByTurf()[turfId] ?? [];
          const freedIds = booking.slotIds?.length
            ? booking.slotIds
            : booking.slot
              ? [booking.slot.id]
              : [];
          const updated = slots.map<Slot>((s) =>
            freedIds.includes(s.id) ? { ...s, status: 'FREE' as Slot['status'] } : s
          );
          this.updateSlots(turfId, updated);
          this.loadSlots(turfId).subscribe();
          this.syncFromServer();
        })
      );
  }

  canExtend(booking: Booking) {
    if (booking.role && booking.role !== 'OWNER') {
      return false;
    }
    if (booking.canExtend === false) {
      return false;
    }
    return booking.status === 'CONFIRMED';
  }

  createSlot(payload: CreateSlotPayload) {
    return this.http
      .post<Slot>(`${environment.apiUrl}/bookings/slots`, payload)
      .pipe(
        tap((slot) => {
          const turfId = slot.turf?.id ?? payload.turfId;
          const slots = this.slotsByTurf()[turfId] ?? [];
          this.updateSlots(turfId, [...slots, slot]);
        })
      );
  }

  requestExtension(booking: Booking, minutes: number): Observable<BookingExtensionRequest> | null {
    if (booking.role && booking.role !== 'OWNER') {
      return null;
    }
    if (!this.canExtend(booking)) {
      return null;
    }
    return this.http
      .post<BookingExtensionRequest>(`${environment.apiUrl}/bookings/${booking.id}/extend`, {
        minutes
      })
      .pipe(
        tap((req) => {
          this.myExtensionsSignal.set([req, ...this.myExtensionsSignal()]);
          this.notifications.pushLocal(
            `Extension requested for booking #${booking.id} (+${minutes}m)`,
            'CHANGE'
          );
          this.refreshExtensions();
        })
      );
  }

  handleExtension(reqId: number, decision: 'APPROVED' | 'DECLINED'): Observable<BookingExtensionRequest> {
    return this.http
      .post<BookingExtensionRequest>(
        `${environment.apiUrl}/bookings/extensions/${reqId}/decision`,
        { decision }
      )
      .pipe(
        tap((updated) => {
          this.managedExtensionsSignal.set(
            this.managedExtensionsSignal().filter((req) => req.id !== updated.id)
          );
          if (updated.turfId) {
            this.loadSlots(updated.turfId).subscribe();
          }
          this.refreshExtensions();
          this.syncFromServer();
        })
      );
  }

  summarizeSlots(turfId: number) {
    const slots = this.slotsFor(turfId);
    const grouped = slots.reduce<Record<string, Slot[]>>((acc, slot) => {
      const dateKey = slot.startAt.split('T')[0];
      acc[dateKey] = acc[dateKey] ?? [];
      acc[dateKey].push(slot);
      return acc;
    }, {});
    return Object.entries(grouped)
      .map(([date, items]) => ({ date, items: items.sort((a, b) => a.startAt.localeCompare(b.startAt)) }))
      .sort((a, b) => a.date.localeCompare(b.date));
  }

  private updateSlots(turfId: number, slots: Slot[]) {
    this.slotsByTurf.set({ ...this.slotsByTurf(), [turfId]: slots });
  }

  private storageKey(userId: number) {
    return `tb.bookings.${userId}`;
  }

  hasBookingForTurf(turfId: number) {
    return this.bookingsSignal().some((booking) => booking.turf.id === turfId);
  }

  loadBookingSummaries(turfId: number) {
    return this.http.get<BookingSummary[]>(`${environment.apiUrl}/bookings/turf/${turfId}`).pipe(
      tap((list) => {
        this.adminBookings.set({ ...this.adminBookings(), [turfId]: list });
      })
    );
  }

  bookingsForManagement(turfId: number) {
    return this.adminBookings()[turfId] ?? [];
  }

  loadTransactions(turfId: number) {
    return this.http
      .get<BookingTransaction[]>(`${environment.apiUrl}/bookings/transactions/${turfId}`)
      .pipe(
        tap((list) => {
          this.transactionsSignal.set({ ...this.transactionsSignal(), [turfId]: list });
        })
      );
  }

  transactionsFor(turfId: number) {
    return this.transactionsSignal()[turfId] ?? [];
  }

  inviteGuest(bookingId: number, contact: string) {
    return this.http
      .post<BookingInvite>(`${environment.apiUrl}/bookings/${bookingId}/invites`, { contact })
      .pipe(
        tap(() => {
          this.notifications.pushLocal(`Invite sent to ${contact}`, 'INVITE');
        })
      );
  }

  loadInvites() {
    const user = this.auth.user();
    if (!user) {
      this.invitesSignal.set([]);
      return;
    }
    this.http
      .get<BookingInvite[]>(`${environment.apiUrl}/bookings/invites`)
      .subscribe((invites) => this.invitesSignal.set(invites));
  }

  acceptInvite(inviteId: number) {
    return this.http
      .post<BookingInvite>(`${environment.apiUrl}/bookings/invites/${inviteId}/accept`, {})
      .pipe(
        tap(() => {
          this.loadInvites();
          this.syncFromServer();
        })
      );
  }

  private loadMyExtensions() {
    return this.http
      .get<BookingExtensionRequest[]>(`${environment.apiUrl}/bookings/extensions?scope=mine`)
      .pipe(tap((list) => this.myExtensionsSignal.set(list)));
  }

  private loadManagedExtensions() {
    return this.http
      .get<BookingExtensionRequest[]>(`${environment.apiUrl}/bookings/extensions?scope=managed`)
      .pipe(tap((list) => this.managedExtensionsSignal.set(list)));
  }

  private refreshExtensions() {
    const user = this.auth.user();
    if (!user) {
      return;
    }
    this.loadMyExtensions().subscribe();
    if (this.canManageExtensions(user)) {
      this.loadManagedExtensions().subscribe();
    }
  }

  private canManageExtensions(user = this.auth.user()) {
    const role = user?.role;
    return role === 'MANAGER' || role === 'ADMIN';
  }

  private syncFromServer() {
    const user = this.auth.user();
    if (!user) {
      return;
    }
    this.http
      .get<Booking[]>(`${environment.apiUrl}/bookings/mine`)
      .subscribe((bookings) => this.bookingsSignal.set(bookings));
  }
}
