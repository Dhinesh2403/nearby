import { Routes }    from '@angular/router';
import { authGuard, adminGuard } from './core/auth/auth.guard';

export const routes: Routes = [
  { path: '',
    loadComponent: () => import('./features/home/home.component').then(m => m.HomeComponent) },

  { path: 'browse',
    loadComponent: () => import('./features/browse/browse.component').then(m => m.BrowseComponent) },

  { path: 'provider/:id',
    loadComponent: () => import('./features/provider/provider-profile.component').then(m => m.ProviderProfileComponent) },

  { path: 'auth/login',
    loadComponent: () => import('./features/auth/login.component').then(m => m.LoginComponent) },

  { path: 'auth/register',
    loadComponent: () => import('./features/auth/register.component').then(m => m.RegisterComponent) },

  { path: 'dashboard/customer',   canActivate: [authGuard],
    loadComponent: () => import('./features/dashboard/customer-dashboard.component').then(m => m.CustomerDashboardComponent) },

  { path: 'dashboard/provider',   canActivate: [authGuard],
    loadComponent: () => import('./features/dashboard/provider-dashboard.component').then(m => m.ProviderDashboardComponent) },

  { path: 'booking/new',          canActivate: [authGuard],
    loadComponent: () => import('./features/booking/booking-form.component').then(m => m.BookingFormComponent) },

  { path: 'booking/:id',          canActivate: [authGuard],
    loadComponent: () => import('./features/booking/booking-detail.component').then(m => m.BookingDetailComponent) },

  { path: 'chat/:bookingId',      canActivate: [authGuard],
    loadComponent: () => import('./features/chat/chat.component').then(m => m.ChatComponent) },

  { path: 'complaints/new',       canActivate: [authGuard],
    loadComponent: () => import('./features/complaints/complaint-form.component').then(m => m.ComplaintFormComponent) },

  { path: 'admin',                canActivate: [authGuard, adminGuard],
    loadComponent: () => import('./features/admin/admin-dashboard.component').then(m => m.AdminDashboardComponent) },

  { path: 'auth',      redirectTo: 'auth/login',           pathMatch: 'full' },
  { path: 'dashboard', redirectTo: 'dashboard/customer',   pathMatch: 'full' },
  { path: '**',        redirectTo: '' },
];
