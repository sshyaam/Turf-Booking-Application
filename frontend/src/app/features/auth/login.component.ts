import { CommonModule } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../core/auth.service';

@Component({
  standalone: true,
  selector: 'app-login',
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  template: `
    <div class="auth-container">
      <section class="card auth-card">
        <h1>Welcome back</h1>
        <p>Book turfs, manage schedules, and keep players engaged.</p>

        <form [formGroup]="form" (ngSubmit)="onSubmit()">
          <label>
            Email or phone
            <input type="text" formControlName="emailOrPhone" placeholder="coach@arena.com" />
          </label>
          <label>
            Password
            <input type="password" formControlName="password" placeholder="********" />
          </label>

          <button class="btn-primary" [disabled]="loading()">
            {{ loading() ? 'Signing in' : 'Login' }}
          </button>
          <div class="error" *ngIf="error()">{{ error() }}</div>
        </form>
        <p class="muted">
          New here?
          <a routerLink="/register">Create an account</a>
        </p>
      </section>
    </div>
  `,
  styles: [
    `
      .auth-container {
        min-height: 100vh;
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 2rem;
        background: radial-gradient(circle at top, #ccfbf1, #f8fafc 55%);
      }
      .auth-card {
        width: min(420px, 100%);
      }
      form {
        display: flex;
        flex-direction: column;
        gap: 1rem;
        margin-top: 1.5rem;
      }
      .muted {
        color: #475569;
        text-align: center;
      }
      .error {
        color: #b91c1c;
        margin-top: 0.5rem;
      }
    `
  ]
})
export class LoginComponent {
  private fb = inject(FormBuilder);
  private auth = inject(AuthService);
  private router = inject(Router);

  form = this.fb.nonNullable.group({
    emailOrPhone: ['', [Validators.required]],
    password: ['', [Validators.required]]
  });
  loading = signal(false);
  error = signal('');

  onSubmit() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.loading.set(true);
    this.error.set('');
    this.auth.login(this.form.getRawValue()).subscribe({
      next: () => {
        this.loading.set(false);
        this.router.navigateByUrl('/');
      },
      error: (err) => {
        this.loading.set(false);
        this.error.set(err?.error ?? 'Unable to login');
      }
    });
  }
}
