import { Injectable, computed, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { tap } from 'rxjs';
import { environment } from '../../environments/environment';
import { Page, Turf, TurfSearchRequest } from '../models/api.models';
import { AuthService } from './auth.service';

@Injectable({ providedIn: 'root' })
export class TurfService {
  private http = inject(HttpClient);
  private auth = inject(AuthService);
  private filtersSignal = signal<TurfSearchRequest>({ page: 0, size: 12 });
  private turfsMap = signal<Map<number, Turf>>(new Map());
  private selectedSignal = signal<Turf | null>(null);
  private lastPage = signal<Page<Turf> | null>(null);

  readonly filters = computed(() => this.filtersSignal());
  readonly selectedTurf = computed(() => this.selectedSignal());
  readonly searchPage = computed(() => this.lastPage());
  readonly managedTurfs = computed(() => {
    const user = this.auth.user();
    if (!user) {
      return [];
    }
    return this.listCached().filter((turf) =>
      turf.managers?.some((manager) => manager.id === user.id)
    );
  });

  search(filters: TurfSearchRequest) {
    this.filtersSignal.set(filters);
    return this.http
      .post<Page<Turf>>(`${environment.apiUrl}/turfs/search`, filters)
      .pipe(
        tap((page) => {
          const mapCopy = new Map(this.turfsMap());
          page.content.forEach((turf) => mapCopy.set(turf.id, turf));
          this.turfsMap.set(mapCopy);
          this.lastPage.set(page);
        })
      );
  }

  loadAll(size = 50) {
    return this.search({ page: 0, size });
  }

  loadMine() {
    return this.http.get<Turf[]>(`${environment.apiUrl}/turfs/mine`).pipe(
      tap((turfs) => {
        const mapCopy = new Map(this.turfsMap());
        turfs.forEach((turf) => mapCopy.set(turf.id, turf));
        this.turfsMap.set(mapCopy);
      })
    );
  }

  createTurf(payload: Partial<Turf>) {
    return this.http.post<Turf>(`${environment.apiUrl}/turfs`, payload).pipe(
      tap((turf) => {
        const mapCopy = new Map(this.turfsMap());
        mapCopy.set(turf.id, turf);
        this.turfsMap.set(mapCopy);
        this.selectedSignal.set(turf);
      })
    );
  }

  approveTurf(id: number) {
    return this.http
      .post<Turf>(`${environment.apiUrl}/turfs/${id}/approve`, {})
      .pipe(
        tap((turf) => {
          const mapCopy = new Map(this.turfsMap());
          mapCopy.set(turf.id, turf);
          this.turfsMap.set(mapCopy);
        })
      );
  }

  uploadImage(id: number, file: File) {
    const form = new FormData();
    form.append('file', file);
    return this.http.post<Turf>(`${environment.apiUrl}/turfs/${id}/images`, form).pipe(
      tap((turf) => {
        const mapCopy = new Map(this.turfsMap());
        mapCopy.set(turf.id, turf);
        this.turfsMap.set(mapCopy);
      })
    );
  }

  rejectTurf(id: number) {
    return this.http.post<Turf>(`${environment.apiUrl}/turfs/${id}/reject`, {}).pipe(
      tap((turf) => {
        const mapCopy = new Map(this.turfsMap());
        mapCopy.set(turf.id, turf);
        this.turfsMap.set(mapCopy);
      })
    );
  }

  rememberSelection(turf: Turf) {
    this.selectedSignal.set(turf);
  }

  getFromCache(id: number) {
    return this.turfsMap().get(id) ?? null;
  }

  fetchOne(id: number) {
    return this.http.get<Turf>(`${environment.apiUrl}/turfs/${id}`).pipe(
      tap((turf) => {
        const mapCopy = new Map(this.turfsMap());
        mapCopy.set(turf.id, turf);
        this.turfsMap.set(mapCopy);
        this.selectedSignal.set(turf);
      })
    );
  }

  loadManagedForAdmin() {
    return this.http.get<Turf[]>(`${environment.apiUrl}/turfs/managed`).pipe(
      tap((turfs) => {
        const mapCopy = new Map(this.turfsMap());
        turfs.forEach((turf) => mapCopy.set(turf.id, turf));
        this.turfsMap.set(mapCopy);
      })
    );
  }

  listCached() {
    return Array.from(this.turfsMap().values());
  }

  pendingTurfs() {
    return this.listCached().filter((t) => t.status === 'PENDING');
  }

  stats() {
    const list = this.listCached();
    const total = list.length;
    const approved = list.filter((t) => t.status === 'APPROVED').length;
    const pending = list.filter((t) => t.status === 'PENDING').length;
    const suspended = list.filter((t) => t.status === 'SUSPENDED').length;
    const cities = new Set(list.map((t) => t.city).filter(Boolean));
    return { total, approved, pending, suspended, cities: cities.size };
  }
}
