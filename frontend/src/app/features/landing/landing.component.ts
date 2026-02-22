import { CommonModule } from '@angular/common';

import { Component, inject } from '@angular/core';

import { RouterLink } from '@angular/router';

import { AuthService } from '../../core/auth.service';

import { TurfSearchComponent } from '../turfs/turf-search.component';



@Component({

  standalone: true,

  selector: 'app-landing',

  imports: [CommonModule, RouterLink, TurfSearchComponent],

  template: `

    <div class="masthead">

      <nav class="top-nav">

        <a class="brand" routerLink="/">TurfOS</a>
        <div class="nav-links">

          <a href="#find">Find Turf</a>

          <a routerLink="/app/bookings">My Bookings</a>

          <a routerLink="/app/turfs/manage" *ngIf="auth.user()">Manage Turf</a>

        </div>

        <div class="nav-actions">

          <a class="btn-link" routerLink="/login" *ngIf="!auth.user()">Login</a>

          <a class="btn-link" routerLink="/register" *ngIf="!auth.user()">Register</a>

          <a class="btn-outline" routerLink="/app">Go to Dashboard</a>

        </div>

      </nav>



      <section class="hero-panel">

        <div>

          <p class="eyebrow">Discover · Schedule · Collect</p>

          <h1>Find turfs in seconds and upgrade to the dashboard whenever you need control.</h1>

          <p>

            Browse public availability, filter by the sport you run, and hop into the manager console to automate

            payouts, maintenance blocks, and invites. Players can still window-shop without creating an account—

            they only sign in when it is time to book.

          </p>

          <div class="hero-buttons">

            <a class="btn-primary" routerLink="/app">Go to Dashboard</a>

            <a class="btn-secondary" routerLink="/login" *ngIf="!auth.user()">Sign in to book</a>

          </div>

        </div>

        <div class="hero-stats">

          <div>

            <strong>Instant Search</strong>

            <span>Filter by city, sport, amenities, or rating.</span>

          </div>

          <div>

            <strong>Role-aware</strong>

            <span>Users see bookings; managers unlock full control.</span>

          </div>

          <div>

            <strong>Refund Smart</strong>

            <span>100% before 24h · 50% after by default.</span>

          </div>

        </div>

      </section>

    </div>



    <section id="find" class="content">

      <header>

        <h2>Find a turf</h2>

        <p>This is the live catalogue. Apply filters, open a turf, and login only when you are ready to book.</p>

      </header>

      <app-turf-search [detailRoutePrefix]="publicRoute"></app-turf-search>

    </section>

  `,

  styles: [

    `

      .masthead {

        background: linear-gradient(135deg, #0f172a, #0e7490);

        color: white;

        padding: 2rem;

      }

      .top-nav {

        display: flex;

        flex-wrap: wrap;

        align-items: center;

        justify-content: space-between;

        gap: 1rem;

        margin-bottom: 2rem;

      }

      .brand {
        font-weight: 700;
        font-size: 1.25rem;
        text-decoration: none;
        color: inherit;
      }
      .nav-links {

        display: flex;

        gap: 1rem;

        flex-wrap: wrap;

      }

      .nav-links a {

        color: white;

        text-decoration: none;

        font-weight: 600;

      }

      .nav-actions {

        display: flex;

        gap: 0.75rem;

        flex-wrap: wrap;

        align-items: center;

      }

      .btn-link {

        color: #bae6fd;

        text-decoration: none;

      }

      .btn-outline {

        border: 1px solid rgba(255, 255, 255, 0.4);

        padding: 0.45rem 1.25rem;

        border-radius: 999px;

        color: white;

        text-decoration: none;

        font-weight: 600;

      }

      .hero-panel {

        display: grid;

        grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));

        gap: 2rem;

      }

      .eyebrow {

        text-transform: uppercase;

        letter-spacing: 0.2em;

        font-size: 0.75rem;

        color: #bae6fd;

      }

      h1 {

        font-size: clamp(2rem, 5vw, 3.5rem);

        margin: 0.5rem 0 1rem;

      }

      .hero-buttons {

        display: flex;

        gap: 1rem;

        margin-top: 1.5rem;

        flex-wrap: wrap;

      }

      .btn-primary,

      .btn-secondary {

        border-radius: 999px;

        padding: 0.6rem 1.5rem;

        text-decoration: none;

        font-weight: 600;

      }

      .btn-primary {

        background: white;

        color: #0f172a;

      }

      .btn-secondary {

        border: 1px solid rgba(255, 255, 255, 0.4);

        color: white;

      }

      .hero-stats {

        display: grid;

        gap: 1rem;

      }

      .hero-stats strong {

        display: block;

        font-size: 1.25rem;

      }

      .content {

        padding: 2rem;

      }

      .content header {

        margin-bottom: 1rem;

      }

    `

  ]

})

export class LandingComponent {

  readonly auth = inject(AuthService);

  readonly publicRoute = '/turfs';

}

