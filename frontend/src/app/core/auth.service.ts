import { Injectable, computed, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { map, tap } from 'rxjs';
import { environment } from '../../environments/environment';
import {
  AuthResponse,
  LoginRequest,
  RegisterRequest,
  UserProfile,
  UserRole
} from '../models/api.models';

const STORAGE_KEY = 'tb.session';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private http = inject(HttpClient);
  private router = inject(Router);
  private session = signal<UserProfile | null>(this.readSession());

  readonly user = computed(() => this.session());
  readonly isLoggedIn = computed(() => !!this.session());
  readonly role = computed(() => this.session()?.role ?? null);

  login(payload: LoginRequest) {
    return this.http
      .post(`${environment.apiUrl}/auth/login`, payload, { responseType: 'text' as 'text' })
      .pipe(
        map((body: string) => JSON.parse(body) as AuthResponse),
        tap((resp) => {
          const existingAvatar = this.session()?.avatar;
          const profile: UserProfile = {
            id: resp.userId,
            email: payload.emailOrPhone.includes('@') ? payload.emailOrPhone : `${resp.userId}@local`,
            phone: payload.emailOrPhone.includes('@') ? undefined : payload.emailOrPhone,
            fullName: resp.fullName,
            role: resp.role,
            status: 'ACTIVE',
            token: resp.token,
            avatar: existingAvatar
          };
          this.persist(profile);
        })
      );
  }

  register(payload: RegisterRequest) {
    return this.http.post(`${environment.apiUrl}/auth/register`, payload, {
      responseType: 'text' as 'text'
    });
  }

  updateProfile(patch: Partial<UserProfile>) {
    const current = this.session();
    if (!current) {
      return;
    }
    const updated: UserProfile = { ...current, ...patch } as UserProfile;
    if ('avatar' in patch && patch.avatar === undefined) {
      delete (updated as any).avatar;
    }
    this.persist(updated);
  }

  logout() {
    this.session.set(null);
    localStorage.removeItem(STORAGE_KEY);
    this.router.navigate(['/']);
  }

  hasRole(roles: UserRole[]) {
    const current = this.session();
    return !!current && roles.includes(current.role);
  }

  authHeaders() {
    const token = this.session()?.token;
    return token ? { Authorization: `Bearer ${token}` } : {};
  }

  private persist(profile: UserProfile) {
    this.session.set(profile);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(profile));
  }

  private readSession(): UserProfile | null {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? (JSON.parse(raw) as UserProfile) : null;
    } catch {
      return null;
    }
  }
}
