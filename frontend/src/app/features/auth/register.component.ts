import { CommonModule } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { AbstractControl, FormBuilder, ReactiveFormsModule, ValidationErrors, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../core/auth.service';

@Component({
  standalone: true,
  selector: 'app-register',
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  template: `
    <div class="auth-container">
      <section class="card auth-card">
        <h1>Create an account</h1>
        <p>Managers, admins, and players share the same portal.</p>

        <form [formGroup]="form" (ngSubmit)="onSubmit()">
          <label>
            Full name
            <input type="text" formControlName="fullName" placeholder="Jordan Perera" />
          </label>
          <label>
            Email
            <input type="email" formControlName="email" placeholder="you@club.com" />
          </label>
          <label>
            Phone (optional)
            <input type="tel" formControlName="phone" placeholder="9876543210" />
          </label>
          <label>
            Password
            <input type="password" formControlName="password" placeholder="********" />
          </label>
          <label>
            Confirm password
            <input type="password" formControlName="confirm" placeholder="********" />
          </label>
          <small>New accounts start as regular users. Promote via admin later.</small>

          <button class="btn-primary" [disabled]="loading()">
            {{ loading() ? 'Creating…' : 'Register' }}
          </button>
          <div class="success" *ngIf="success()">{{ success() }}</div>
          <div class="error" *ngIf="error()">{{ error() }}</div>
        </form>
        <p class="muted">
          Already onboard?
          <a routerLink="/login">Login</a>
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
        background: radial-gradient(circle at top, #e0f2fe, #f8fafc 55%);
      }
      .auth-card {
        width: min(480px, 100%);
      }
      form {
        display: flex;
        flex-direction: column;
        gap: 1rem;
        margin-top: 1.5rem;
      }
      .success {
        color: #15803d;
      }
      .error {
        color: #b91c1c;
      }
    `
  ]
})
export class RegisterComponent {
  private fb = inject(FormBuilder);
  private auth = inject(AuthService);
  private router = inject(Router);



  readonly passwordPattern = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{6,}$/;

  form = this.fb.nonNullable.group({
    fullName: ['', Validators.required],
    email: ['', [Validators.required, Validators.email]],
    phone: ['', [Validators.pattern(/^[0-9+\-()\s]{7,15}$/)]],
    password: ['', [Validators.required, Validators.pattern(this.passwordPattern)]],
    confirm: ['', Validators.required]
  }, { validators: this.passwordsMatchValidator });

  loading = signal(false);
  error = signal('');
  success = signal('');
  private passwordsMatchValidator(control: AbstractControl): ValidationErrors | null {
    const password = control.get('password')?.value;
    const confirm = control.get('confirm')?.value;
    return password && confirm && password !== confirm ? { passwordsMismatch: true } : null;
  }


  onSubmit() {
    if (this.form.invalid || this.form.value.password !== this.form.value.confirm) {
      this.error.set('Passwords must match and required fields cannot be empty.');
      return;
    }
    this.loading.set(true);
    this.error.set('');
    this.auth
      .register({
        fullName: this.form.value.fullName!,
        email: this.form.value.email!,
        phone: this.form.value.phone!,
        password: this.form.value.password!
      })
      .subscribe({
        next: () => {
          this.loading.set(false);
          this.success.set('Registration successful. You can log in now.');
          setTimeout(() => this.router.navigate(['/login']), 800);
        },
        error: (err) => {
          this.loading.set(false);
          this.error.set(err?.error ?? 'Unable to create account');
        }
      });
  }
}

