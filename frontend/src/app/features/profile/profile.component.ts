import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { AuthService } from '../../core/auth.service';

@Component({
  standalone: true,
  selector: 'app-profile',
  imports: [CommonModule, ReactiveFormsModule],
  template: `
    <section class="card" *ngIf="user() as current">
      <h2>Profile</h2>
      <div class="profile-header">
        <div class="avatar" [style.background-image]="avatar() ? 'url(' + avatar() + ')' : ''">
          <span *ngIf="!avatar()">{{ initials(current.fullName) }}</span>
        </div>
        <div>
          <h3>{{ current.fullName }}</h3>
          <p>{{ current.email }}</p>
          <p>Status: <strong>{{ current.status }}</strong></p>
        </div>
      </div>
    </section>

    <section class="card" *ngIf="user()">
      <h3>Edit details</h3>
      <form [formGroup]="form" (ngSubmit)="save()" class="grid grid-2">
        <label>Full name <input formControlName="fullName" /></label>
        <label>Phone <input formControlName="phone" /></label>
        <label>Email <input formControlName="email" disabled /></label>
        <label>Status <input formControlName="status" disabled /></label>
        <button class="btn-primary" type="submit" [disabled]="form.invalid">Save changes</button>
      </form>
    </section>

    <section class="card" *ngIf="user()">
      <h3>Profile photo</h3>
      <div class="avatar-preview" [style.background-image]="avatar() ? 'url(' + avatar() + ')' : ''">
        <span *ngIf="!avatar()">{{ initials(user()?.fullName || '') }}</span>
      </div>
      <div class="grid grid-2">
        <label class="btn-secondary upload">
          Upload image
          <input type="file" (change)="onAvatarChange($event)" />
        </label>
        <button class="btn-secondary" type="button" (click)="removeAvatar()" [disabled]="!avatar()">Remove photo</button>
      </div>
      <small class="muted">Images stay in this browser (no server upload yet).</small>
    </section>
  `,
  styles: [
    `
      .profile-header {
        display: flex;
        gap: 1rem;
        align-items: center;
      }
      .avatar,
      .avatar-preview {
        width: 96px;
        height: 96px;
        border-radius: 50%;
        background: #e2e8f0 center/cover no-repeat;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 1.5rem;
        font-weight: 600;
        color: #0f172a;
      }
      .upload {
        position: relative;
        overflow: hidden;
      }
      .upload input {
        position: absolute;
        inset: 0;
        opacity: 0;
        cursor: pointer;
      }
      .muted {
        color: #475569;
      }
    `
  ]
})
export class ProfileComponent implements OnInit {
  private auth = inject(AuthService);
  private fb = inject(FormBuilder);

  readonly user = this.auth.user;
  avatar = signal<string | null>(null);

  form = this.fb.nonNullable.group({
    fullName: ['', Validators.required],
    phone: [''],
    email: [{ value: '', disabled: true }],
    status: [{ value: '', disabled: true }]
  });

  ngOnInit() {
    const current = this.user();
    if (current) {
      this.form.patchValue({
        fullName: current.fullName,
        phone: current.phone ?? '',
        email: current.email,
        status: current.status
      });
      this.avatar.set(current.avatar ?? null);
    }
  }

  save() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const { fullName, phone } = this.form.getRawValue();
    this.auth.updateProfile({ fullName: fullName!, phone: phone || undefined });
  }

  onAvatarChange(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) {
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      this.avatar.set(result);
      this.auth.updateProfile({ avatar: result });
    };
    reader.readAsDataURL(file);
  }

  removeAvatar() {
    this.avatar.set(null);
    this.auth.updateProfile({ avatar: undefined });
  }

  initials(name: string) {
    return name
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase() ?? '')
      .join('');
  }
}
