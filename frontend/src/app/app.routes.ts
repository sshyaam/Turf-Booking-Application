import { Routes, CanActivateFn, Router } from '@angular/router';
import { inject } from '@angular/core';
import { AuthService } from './core/auth.service';

const authGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  if (auth.isLoggedIn()) {
    return true;
  }
  return inject(Router).createUrlTree(['/login']);
};

const guestGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  return auth.isLoggedIn() ? inject(Router).createUrlTree(['/app']) : true;
};

const roleGuard = (roles: string[]): CanActivateFn => () => {
  const auth = inject(AuthService);
  if (auth.hasRole(roles as any)) {
    return true;
  }
  return inject(Router).createUrlTree(['/app']);
};

export const routes: Routes = [
  {
    path: '',
    pathMatch: 'full',
    loadComponent: () => import('./features/landing/landing.component').then((m) => m.LandingComponent)
  },
  {
    path: 'login',
    canActivate: [guestGuard],
    loadComponent: () => import('./features/auth/login.component').then((m) => m.LoginComponent)
  },
  {
    path: 'register',
    canActivate: [guestGuard],
    loadComponent: () => import('./features/auth/register.component').then((m) => m.RegisterComponent)
  },
  {
    path: 'turfs/:id',
    loadComponent: () => import('./features/turfs/turf-detail.component').then((m) => m.TurfDetailComponent)
  },
  {
    path: 'app',
    canActivate: [authGuard],
    loadComponent: () => import('./features/layout/shell.component').then((m) => m.ShellComponent),
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'turfs' },
      {
        path: 'turfs/new',
        loadComponent: () => import('./features/turfs/turf-create.component').then((m) => m.TurfCreateComponent)
      },
      {
        path: 'turfs/manage',
        loadComponent: () => import('./features/turfs/turf-manage.component').then((m) => m.TurfManageComponent)
      },
      {
        path: 'turfs/:id',
        loadComponent: () => import('./features/turfs/turf-detail.component').then((m) => m.TurfDetailComponent)
      },
      {
        path: 'turfs',
        pathMatch: 'full',
        loadComponent: () => import('./features/turfs/turf-search.component').then((m) => m.TurfSearchComponent)
      },
      {
        path: 'bookings',
        loadComponent: () => import('./features/bookings/booking-center.component').then((m) => m.BookingCenterComponent)
      },
      {
        path: 'support',
        loadComponent: () => import('./features/support/support-center.component').then((m) => m.SupportCenterComponent)
      },
      {
        path: 'notifications',
        loadComponent: () =>
          import('./features/notifications/notification-center.component').then((m) => m.NotificationCenterComponent)
      },
      {
        path: 'profile',
        loadComponent: () => import('./features/profile/profile.component').then((m) => m.ProfileComponent)
      },
      {
        path: 'admin/moderation',
        canActivate: [roleGuard(['ADMIN'])],
        loadComponent: () =>
          import('./features/admin/admin-moderation.component').then((m) => m.AdminModerationComponent)
      }
    ]
  },
  { path: '**', redirectTo: '' }
];
