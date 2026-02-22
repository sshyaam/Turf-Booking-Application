import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { catchError, of, tap, throwError } from 'rxjs';
import { environment } from '../../environments/environment';
import { UserSummary } from '../models/api.models';

@Injectable({ providedIn: 'root' })
export class UserDirectoryService {
  private http = inject(HttpClient);
  private cache = new Map<string, UserSummary | null>();

  lookup(identity: string) {
    const key = identity.trim().toLowerCase();
    if (!key) {
      return of(null);
    }
    if (this.cache.has(key)) {
      return of(this.cache.get(key) ?? null);
    }
    return this.http
      .get<UserSummary>(`${environment.apiUrl}/users/lookup`, {
        params: { identity }
      })
      .pipe(
        tap((user) => this.cache.set(key, user)),
        catchError((error) => {
          if (error.status === 404) {
            this.cache.set(key, null);
            return of(null);
          }
          return throwError(() => error);
        })
      );
  }
}
