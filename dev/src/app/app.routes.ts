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

  { path: 'provider-signup',
    loadComponent: () => import('./features/auth/provider-register.component').then(m => m.ProviderRegisterComponent) },

  { path: 'dashboard/customer',   canActivate: [roleGuard('customer')],
    loadComponent: () => import('./features/dashboard/customer-dashboard.component').then(m => m.CustomerDashboardComponent) },

  { path: 'dashboard/provider',   canActivate: [roleGuard('provider')],
    loadComponent: () => import('./features/dashboard/provider-dashboard.component').then(m => m.ProviderDashboardComponent) },

{ path: 'chats',                canActivate: [roleGuard('customer', 'provider', 'admin')],
    loadComponent: () => import('./features/chat/chats-list.component').then(m => m.ChatsListComponent) },

  { path: 'chat/:conversationId', canActivate: [roleGuard('customer', 'provider', 'admin')],
    loadComponent: () => import('./features/chat/chat.component').then(m => m.ChatComponent) },

  { path: 'complaints/new',       canActivate: [roleGuard('customer', 'provider')],
    loadComponent: () => import('./features/complaints/complaint-form.component').then(m => m.ComplaintFormComponent) },

  // Any logged-in user can edit their own account
  { path: 'settings',             canActivate: [authGuard],
    loadComponent: () => import('./features/settings/settings.component').then(m => m.SettingsComponent) },

  { path: 'admin',                canActivate: [authGuard, adminGuard],
    loadComponent: () => import('./features/admin/admin-dashboard.component').then(m => m.AdminDashboardComponent) },

  { path: 'about',
    loadComponent: () => import('./features/static/about.component').then(m => m.AboutComponent) },

  { path: 'how-it-works',
    loadComponent: () => import('./features/static/how-it-works.component').then(m => m.HowItWorksComponent) },

  { path: 'faq',
    loadComponent: () => import('./features/static/faq.component').then(m => m.FaqComponent) },

  { path: 'blog',
    loadComponent: () => import('./features/static/blog.component').then(m => m.BlogComponent) },

  { path: 'blog/find-trusted-plumber-coimbatore',
    loadComponent: () => import('./features/static/blog/find-trusted-plumber-coimbatore.component').then(m => m.PlumberArticleComponent) },

  { path: 'blog/benefits-of-hiring-local-professionals',
    loadComponent: () => import('./features/static/blog/benefits-of-hiring-local-professionals.component').then(m => m.LocalBenefitsArticleComponent) },

  { path: 'blog/why-hyperlocal-marketplaces-growing-india',
    loadComponent: () => import('./features/static/blog/why-hyperlocal-marketplaces-growing-india.component').then(m => m.HyperlocalArticleComponent) },

  { path: 'terms',
    loadComponent: () => import('./features/legal/terms.component').then(m => m.TermsComponent) },

  { path: 'privacy',
    loadComponent: () => import('./features/legal/privacy.component').then(m => m.PrivacyComponent) },

  // Friendly aliases for the legal pages
  { path: 'privacy-policy',     redirectTo: 'privacy', pathMatch: 'full' },
  { path: 'terms-of-service',   redirectTo: 'terms',   pathMatch: 'full' },

  { path: 'auth',      redirectTo: 'auth/login',           pathMatch: 'full' },
  { path: 'dashboard', redirectTo: 'dashboard/customer',   pathMatch: 'full' },
  { path: '**',        redirectTo: '' },
];
