import { Routes }    from '@angular/router';
import { authGuard, adminGuard, roleGuard, nonAdminGuard } from './core/auth/auth.guard';

export const routes: Routes = [
  { path: '',
    loadComponent: () => import('./features/home/home.component').then(m => m.HomeComponent) },

  { path: 'browse',               canActivate: [nonAdminGuard],
    loadComponent: () => import('./features/browse/browse.component').then(m => m.BrowseComponent) },

  // Provider edits their own service details (create or update)
  { path: 'provider/services',    canActivate: [roleGuard('provider')],
    loadComponent: () => import('./features/provider/provider-edit.component').then(m => m.ProviderEditComponent) },

  { path: 'provider/:id',
    loadComponent: () => import('./features/provider/provider-profile.component').then(m => m.ProviderProfileComponent) },

  { path: 'auth/login',
    loadComponent: () => import('./features/auth/login.component').then(m => m.LoginComponent) },

  { path: 'auth/register',
    loadComponent: () => import('./features/auth/register.component').then(m => m.RegisterComponent) },

  { path: 'dashboard/customer',   canActivate: [roleGuard('customer')],
    loadComponent: () => import('./features/dashboard/customer-dashboard.component').then(m => m.CustomerDashboardComponent) },

  { path: 'dashboard/provider',   canActivate: [roleGuard('provider')],
    loadComponent: () => import('./features/dashboard/provider-dashboard.component').then(m => m.ProviderDashboardComponent) },

  // Only customers can create a booking — admins/providers are bounced by the guard.
  { path: 'booking/new',          canActivate: [roleGuard('customer')],
    loadComponent: () => import('./features/booking/booking-form.component').then(m => m.BookingFormComponent) },

  // A booking is viewed by the customer or the provider involved (not admin).
  { path: 'booking/:id',          canActivate: [roleGuard('customer', 'provider')],
    loadComponent: () => import('./features/booking/booking-detail.component').then(m => m.BookingDetailComponent) },

  { path: 'chats',                canActivate: [roleGuard('customer', 'provider')],
    loadComponent: () => import('./features/chat/chats-list.component').then(m => m.ChatsListComponent) },

  { path: 'chat/:conversationId', canActivate: [roleGuard('customer', 'provider')],
    loadComponent: () => import('./features/chat/chat.component').then(m => m.ChatComponent) },

  { path: 'complaints/new',       canActivate: [roleGuard('customer', 'provider')],
    loadComponent: () => import('./features/complaints/complaint-form.component').then(m => m.ComplaintFormComponent) },

  // Any logged-in user can edit their own account
  { path: 'settings',             canActivate: [authGuard],
    loadComponent: () => import('./features/settings/settings.component').then(m => m.SettingsComponent) },

  { path: 'admin',                canActivate: [authGuard, adminGuard],
    loadComponent: () => import('./features/admin/admin-dashboard.component').then(m => m.AdminDashboardComponent) },

  { path: 'auth',      redirectTo: 'auth/login',           pathMatch: 'full' },
  { path: 'dashboard', redirectTo: 'dashboard/customer',   pathMatch: 'full' },
  { path: '**',        redirectTo: '' },
];
