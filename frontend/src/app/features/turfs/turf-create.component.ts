import { CommonModule } from '@angular/common';

import { Component, Input, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';

import { FormsModule } from '@angular/forms';

import { Router } from '@angular/router';

import { forkJoin, map, of, switchMap } from 'rxjs';

import { TurfService } from '../../core/turf.service';
import { UserDirectoryService } from '../../core/user-directory.service';



interface ModeratorContact {

  id: string;

  value: string;

  type: 'email' | 'phone';

}



const MAX_IMAGE_BYTES = 2 * 1024 * 1024;

const MOD_STORAGE_KEY = 'tb.turfModerators';



@Component({

  standalone: true,

  selector: 'app-turf-create',

  imports: [CommonModule, ReactiveFormsModule, FormsModule],

  template: `
    <section class="card">
      <button class="back-button" type="button" *ngIf="showBackButton" (click)="goBack()">&larr; Back</button>
      <h2>Create a new turf</h2>
      <form [formGroup]="createForm" (ngSubmit)="createTurf()" class="grid grid-2">

        <label>Name <input formControlName="name" /></label>

        <label>City <input formControlName="city" /></label>

        <label>State <input formControlName="state" /></label>

        <label>Pincode <input formControlName="pincode" /></label>

        <label>Sports (comma separated)

          <input formControlName="sports" placeholder="Football, Cricket" />

        </label>

        <div class="card" style="grid-column: 1 / -1;">

          <header class="section-head">

            <h4>Amenities</h4>

            <small>Select available amenities from the dropdown below.</small>

          </header>

          <div class="grid grid-2">

            <label>Select amenity

              <select [(ngModel)]="draftAmenity" [ngModelOptions]="{ standalone: true }" name="draftAmenity">

                <option value="">Choose an amenity...</option>

                <option *ngFor="let amenity of amenitiesOptions" [value]="amenity">{{ amenity }}</option>

              </select>

            </label>

            <button class="btn-secondary" type="button" (click)="addAmenity()">Add</button>

          </div>

          <div class="chip-row">

            <span class="chip" *ngFor="let amenity of selectedAmenities(); let i = index">

              {{ amenity }}

              <button type="button" (click)="removeAmenity(i)">×</button>

            </span>

          </div>

        </div>

        <label>Open time <input type="time" formControlName="openTime" /></label>

        <label>Close time <input type="time" formControlName="closeTime" /></label>

        <label>Hourly price (INR)

          <input type="number" min="0" formControlName="hourlyPrice" placeholder="1500" />

        </label>

        <label class="textarea" style="grid-column: 1 / -1;">

          Notes

          <textarea rows="2" formControlName="notes" placeholder="Describe the turf for moderators"></textarea>

        </label>

        <div class="card" style="grid-column: 1 / -1;">

          <header class="section-head">

            <h4>Custom pricing (optional)</h4>

            <small>Override base hourly rate for specific days.</small>

          </header>

          <div class="grid grid-3">

            <label>Day

              <select [(ngModel)]="customDay" [ngModelOptions]="{ standalone: true }" name="customDay">

                <option *ngFor="let day of days" [value]="day">{{ day }}</option>

              </select>

            </label>

            <label>Price (INR)

              <input

                type="number"

                min="0"

                [(ngModel)]="customPrice"

                [ngModelOptions]="{ standalone: true }"

                name="customPrice"

              />

            </label>

            <button class="btn-secondary" type="button" (click)="addCustomPrice()">Add day</button>

          </div>

          <div class="chip-row">

            <span class="chip" *ngFor="let entry of customPricing(); let i = index">

              {{ entry.day }} - INR {{ entry.price }}

              <button type="button" (click)="removeCustomPrice(i)">×</button>

            </span>

          </div>

        </div>

        <div class="card" style="grid-column: 1 / -1;">

          <header class="section-head">

            <h4>Moderators</h4>

            <small>Add emails or phone numbers one at a time.</small>

          </header>

          <div class="grid grid-3">

            <label>Contact

              <input

                [(ngModel)]="draftModerator.contact"

                [ngModelOptions]="{ standalone: true }"

                name="draftModerator"

                placeholder="coach@club.com"

              />

            </label>

            <label>Type

              <select

                [(ngModel)]="draftModerator.type"

                [ngModelOptions]="{ standalone: true }"

                name="draftModeratorType"

              >

                <option value="email">Email</option>

                <option value="phone">Phone</option>

              </select>

            </label>

            <button class="btn-secondary" type="button" (click)="queueModerator()">Add</button>

          </div>
          <small class="muted" *ngIf="moderatorStatus()">{{ moderatorStatus() }}</small>

          <div class="chip-row">

            <span class="chip" *ngFor="let mod of moderators()">

              {{ mod.value }} ({{ mod.type }})

              <button type="button" (click)="removeModerator(mod.id)">×</button>

            </span>

          </div>

        </div>

        <div class="card" style="grid-column: 1 / -1;">

          <header class="section-head">

            <h4>Photos</h4>

            <small>Upload hero images (max 2MB each). Stored server-side after approval.</small>

          </header>

          <label class="btn-secondary upload">

            Select image

            <input type="file" (change)="queuePhoto($event)" />

          </label>

          <small class="muted" *ngIf="photoError()">{{ photoError() }}</small>

          <div class="chip-row">

            <span class="chip" *ngFor="let file of pendingPhotos(); let i = index">

              {{ file.name }} <button type="button" (click)="removePhoto(i)">×</button>

            </span>

          </div>

        </div>

        <button class="btn-primary" type="submit" style="grid-column: 1 / -1;" [disabled]="createForm.invalid">

          Submit for approval

        </button>

        <p class="muted" *ngIf="createMessage()">{{ createMessage() }}</p>

      </form>

    </section>

  `,

  styles: [

    `

      .chip-row {

        display: flex;

        flex-wrap: wrap;

        gap: 0.5rem;

        margin-top: 0.75rem;

      }

      .chip {

        background: #e2e8f0;

        border-radius: 999px;

        padding: 0.25rem 0.75rem;

        display: inline-flex;

        align-items: center;

        gap: 0.4rem;

      }

      .chip button {

        border: none;

        background: transparent;

        cursor: pointer;

      }

      .upload {

        position: relative;

        overflow: hidden;

        display: inline-flex;

        width: fit-content;

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

export class TurfCreateComponent {
  private fb = inject(FormBuilder);
  private turfService = inject(TurfService);
  private directory = inject(UserDirectoryService);
  private router = inject(Router);
  @Input() showBackButton = true;


  createForm = this.fb.nonNullable.group({

    name: ['', Validators.required],

    city: [''],

    state: [''],

    pincode: [''],

    sports: [''],

    openTime: [''],

    closeTime: [''],

    hourlyPrice: [1500],

    notes: ['']

  });



  moderators = signal<ModeratorContact[]>([]);

  pendingPhotos = signal<File[]>([]);

  createMessage = signal('');

  photoError = signal('');

  moderatorStatus = signal('');

  customPricing = signal<{ day: string; price: number }[]>([]);

  selectedAmenities = signal<string[]>([]);

  customDay = 'MONDAY';

  customPrice = 0;

  draftAmenity = '';

  readonly days = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY'];

  readonly amenitiesOptions = ['Cafe', 'Parking', 'Security', 'Service', 'Lockers', 'Showers'];

  draftModerator: { contact: string; type: 'email' | 'phone' } = { contact: '', type: 'email' };



  queueModerator() {
    const value = this.draftModerator.contact.trim();
    if (!value) {
      return;
    }
    if (this.moderators().some((mod) => mod.value.toLowerCase() === value.toLowerCase())) {
      this.moderatorStatus.set('Contact already added.');
      return;
    }
    this.moderatorStatus.set('Validating contact...');
    this.directory.lookup(value).subscribe({
      next: (user) => {
        if (!user) {
          this.moderatorStatus.set('No user found with that email or phone.');
          return;
        }
        this.moderators.set([
          { id: this.newId(), value, type: this.draftModerator.type },
          ...this.moderators()
        ]);
        this.moderatorStatus.set('');
        this.draftModerator = { contact: '', type: this.draftModerator.type };
      },
      error: () => {
        this.moderatorStatus.set('Could not verify contact. Try again.');
      }
    });
  }



  removeModerator(id: string) {

    this.moderators.set(this.moderators().filter((mod) => mod.id !== id));

  }

  addAmenity() {

    const value = this.draftAmenity.trim();

    if (!value) {

      return;

    }

    const current = this.selectedAmenities();

    if (!current.includes(value)) {

      this.selectedAmenities.set([...current, value]);

    }

    this.draftAmenity = '';

  }

  removeAmenity(index: number) {

    this.selectedAmenities.set(this.selectedAmenities().filter((_, idx) => idx !== index));

  }



  queuePhoto(event: Event) {

    const input = event.target as HTMLInputElement;

    const file = input.files?.[0];

    if (!file) return;

    if (file.size > MAX_IMAGE_BYTES) {

      this.photoError.set('Image exceeds 2MB. Please upload a smaller file.');

      input.value = '';

      return;

    }

    this.photoError.set('');

    this.pendingPhotos.set([file, ...this.pendingPhotos()]);

    input.value = '';

  }



  removePhoto(index: number) {

    this.pendingPhotos.set(this.pendingPhotos().filter((_, idx) => idx !== index));

  }



  addCustomPrice() {

    const priceValue = Number(this.customPrice);

    if (!priceValue || priceValue <= 0) {

      return;

    }

    const entry = { day: this.customDay, price: priceValue };

    this.customPricing.set([entry, ...this.customPricing().filter((item) => item.day !== entry.day)]);

    this.customPrice = 0;

  }



  removeCustomPrice(index: number) {

    this.customPricing.set(this.customPricing().filter((_, idx) => idx !== index));

  }



  createTurf() {

    if (this.createForm.invalid) {

      this.createForm.markAllAsTouched();

      return;

    }

    const value = this.createForm.getRawValue();

    const payload: any = {

      name: value.name,

      city: value.city,

      state: value.state,

      pincode: value.pincode,

      sports: value.sports?.split(',').map((s) => s.trim()).filter(Boolean) ?? [],

      amenities: this.selectedAmenities(),

      openTime: value.openTime || null,

      closeTime: value.closeTime || null,

      hourlyPrice: value.hourlyPrice ? Number(value.hourlyPrice) * 100 : 0,

      customPricing: this.customPricing().reduce<Record<string, number>>((acc, entry) => {

        acc[entry.day] = entry.price * 100;

        return acc;

      }, {}),

      managers: this.moderators().map(mod => ({

        contact: mod.value,

        type: mod.type

      }))

    };

    this.turfService

      .createTurf(payload)

      .pipe(

        switchMap((turf) => {

          const files = [...this.pendingPhotos()];

          if (!files.length) {

            return of(turf);

          }

          return forkJoin(files.map((file) => this.turfService.uploadImage(turf.id, file))).pipe(

            map((responses) => responses[responses.length - 1] ?? turf)

          );

        })

      )

      .subscribe({

        next: (turf) => {

          this.createMessage.set(`Turf ${turf.name} submitted for review.`);

          this.createForm.reset({ hourlyPrice: 1500 });

          this.pendingPhotos.set([]);

          this.customPricing.set([]);

          this.moderators.set([]);

          this.selectedAmenities.set([]);

          this.photoError.set('');

          this.draftModerator = { contact: '', type: 'email' };

          this.draftAmenity = '';

          this.customDay = 'MONDAY';

          this.customPrice = 0;

          setTimeout(() => this.router.navigate(['/app/turfs/manage']), 800);

        },

        error: () => this.createMessage.set('Could not submit turf right now. Please try again.')

      });

  }



  private newId() {

    const random = globalThis.crypto?.randomUUID?.();

    return random ?? `mod-${Math.random().toString(36).slice(2, 9)}`;

  }

  goBack() {
    if (typeof window !== 'undefined' && window.history.length > 1) {
      window.history.back();
      return;
    }
    this.router.navigate(['/app/turfs/manage']);
  }
}


