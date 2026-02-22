import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { tap } from 'rxjs';
import { environment } from '../../environments/environment';
import { Notification } from '../models/api.models';

@Injectable({ providedIn: 'root' })
export class NotificationService {
  private http = inject(HttpClient);
  private items = signal<Notification[]>([]);

  readonly notifications = this.items.asReadonly();

  loadMine() {
    return this.http
      .get<Notification[]>(`${environment.apiUrl}/notifications`)
      .pipe(tap((list) => this.items.set(list)));
  }

  pushLocal(message: string, type: Notification['type']) {
    const notification: Notification = {
      id: Number(new Date()),
      message,
      type,
      createdAt: new Date().toISOString(),
      read: false
    };
    this.items.set([notification, ...this.items()]);
  }

  markRead(id: number) {
    this.items.set(this.items().map((n) => (n.id === id ? { ...n, read: true } : n)));
  }

  clearAll() {
    this.items.set([]);
  }
}
