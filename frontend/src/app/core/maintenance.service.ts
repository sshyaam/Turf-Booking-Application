import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { tap } from 'rxjs';
import { environment } from '../../environments/environment';
import { MaintenanceBlock } from '../models/api.models';

export interface MaintenanceRequest {
  turfId: number;
  reason: string;
  startAt: string;
  endAt: string;
}

@Injectable({ providedIn: 'root' })
export class MaintenanceService {
  private http = inject(HttpClient);
  private blocks = signal<Record<number, MaintenanceBlock[]>>({});

  list(turfId: number) {
    return this.http.get<MaintenanceBlock[]>(`${environment.apiUrl}/maintenance/${turfId}`).pipe(
      tap((list) => this.blocks.set({ ...this.blocks(), [turfId]: list }))
    );
  }

  create(request: MaintenanceRequest) {
    return this.http.post<MaintenanceBlock>(`${environment.apiUrl}/maintenance`, request).pipe(
      tap((block) => {
        const current = this.blocks();
        const list = current[request.turfId] ?? [];
        this.blocks.set({ ...current, [request.turfId]: [block, ...list] });
      })
    );
  }

  blocksFor(turfId: number) {
    return this.blocks()[turfId] ?? [];
  }
}
