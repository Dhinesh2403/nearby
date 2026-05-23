import { Component, signal, computed, OnInit } from '@angular/core';
import { RouterOutlet, RouterLink, RouterLinkActive, Router } from '@angular/router';
import { CommonModule }  from '@angular/common';
import { AuthService }   from './core/auth/auth.service';
import { ToastService }  from './core/services/toast.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive, CommonModule],
  template: `
    <!-- NAVBAR -->
    <nav class="navbar navbar-expand-lg nb-navbar sticky-top">
      <div class="container">
        <a class="navbar-brand" routerLink="/">Near<span>By</span></a>

        <button class="navbar-toggler border-0" type="button"
                (click)="navOpen.set(!navOpen())">
          <i class="bi" [class.bi-list]="!navOpen()" [class.bi-x]="navOpen()"></i>
        </button>

        <div class="collapse navbar-collapse" [class.show]="navOpen()">
          <ul class="navbar-nav me-auto gap-1">
            <li class="nav-item">
              <a class="nav-link" routerLink="/"
                 routerLinkActive="active" [routerLinkActiveOptions]="{exact:true}">Home</a>
            </li>
            <li class="nav-item">
              <a class="nav-link" routerLink="/browse" routerLinkActive="active">Browse</a>
            </li>
            @if (isLoggedIn()) {
              <li class="nav-item">
                <a class="nav-link" [routerLink]="dashboardRoute()" routerLinkActive="active">
                  Dashboard
                </a>
              </li>
            }
            @if (isAdmin()) {
              <li class="nav-item">
                <a class="nav-link" routerLink="/admin" routerLinkActive="active">
                  <i class="bi bi-shield-check me-1"></i>Admin
                </a>
              </li>
            }
          </ul>

          <div class="d-flex align-items-center gap-2">
            @if (!isLoggedIn()) {
              <a routerLink="/auth/login"    class="btn-nb-outline btn btn-sm">Login</a>
              <a routerLink="/auth/register" class="btn-nb-primary btn btn-sm">Join Free</a>
            } @else {
              <div class="dropdown">
                <button class="btn d-flex align-items-center gap-2 px-3 py-2 rounded-3"
                        style="background:var(--nb-surface-2);border:1px solid var(--nb-border)"
                        data-bs-toggle="dropdown">
                  <div class="u-avatar">{{ currentUser()?.name?.charAt(0)?.toUpperCase() }}</div>
                  <span class="fw-display" style="font-size:.875rem;font-weight:600">
                    {{ (currentUser()?.name || '').split(' ')[0] }}
                  </span>
                  <i class="bi bi-chevron-down" style="font-size:.7rem"></i>
                </button>
                <ul class="dropdown-menu dropdown-menu-end shadow border-0 mt-1">
                  <li>
                    <a class="dropdown-item" [routerLink]="dashboardRoute()">
                      <i class="bi bi-speedometer2 me-2"></i>Dashboard
                    </a>
                  </li>
                  <li><hr class="dropdown-divider"></li>
                  <li>
                    <button class="dropdown-item text-danger" (click)="logout()">
                      <i class="bi bi-box-arrow-right me-2"></i>Logout
                    </button>
                  </li>
                </ul>
              </div>
            }
          </div>
        </div>
      </div>
    </nav>

    <!-- MAIN CONTENT -->
    <main>
      <router-outlet />
    </main>

    <!-- FOOTER -->
    <footer style="background:var(--nb-primary);color:#fff;padding:3rem 0 1.5rem">
      <div class="container">
        <div class="row g-4 mb-3">
          <div class="col-md-4">
            <div class="fw-display" style="font-size:1.5rem;font-weight:800;margin-bottom:.5rem">
              Near<span style="color:var(--nb-accent)">By</span>
            </div>
            <p style="color:rgba(255,255,255,.6);font-size:.875rem">
              Connecting your city, one service at a time.
            </p>
          </div>
          <div class="col-md-2">
            <p class="footer-heading">Platform</p>
            <div class="footer-links">
              <a routerLink="/browse">Browse</a>
              <a routerLink="/auth/register">Join Free</a>
            </div>
          </div>
          <div class="col-md-3">
            <p class="footer-heading">Categories</p>
            <div class="footer-links">
              <span>Home Services</span>
              <span>Education</span>
              <span>Food & Essentials</span>
            </div>
          </div>
          <div class="col-md-3">
            <p class="footer-heading">Contact</p>
            <div class="footer-links">
              <span>hello&#64;getnearby.in</span>
              <span>Chennai, India</span>
            </div>
          </div>
        </div>
        <div style="border-top:1px solid rgba(255,255,255,.1);padding-top:1rem;text-align:center;color:rgba(255,255,255,.4);font-size:.8rem">
          © 2026 NearBy. All rights reserved.
        </div>
      </div>
    </footer>

    <!-- GLOBAL TOAST NOTIFICATIONS -->
    <div class="nb-toast-wrap">
      @for (t of toastService.toasts(); track t.id) {
        <div class="nb-toast" [class.error]="t.type === 'error'">
          <i class="bi me-2"
             [class.bi-check-circle-fill]="t.type==='success'"
             [class.bi-exclamation-circle-fill]="t.type==='error'"
             [class.bi-info-circle-fill]="t.type==='info'"
             [style.color]="t.type==='error' ? 'var(--nb-danger)' : t.type==='success' ? 'var(--nb-success)' : 'var(--nb-primary)'">
          </i>
          {{ t.message }}
        </div>
      }
    </div>
  `,
  styles: [`
    .u-avatar { width:28px;height:28px;background:var(--nb-primary);color:#fff;border-radius:50%;display:flex;align-items:center;justify-content:center;font-family:var(--font-display);font-weight:700;font-size:.8rem; }
    .dropdown-item { font-size:.875rem;padding:.5rem 1rem; }
    .dropdown-item:hover { background:var(--nb-surface-2); }
    .footer-heading { font-family:var(--font-display);font-weight:700;font-size:.78rem;text-transform:uppercase;letter-spacing:.05em;color:rgba(255,255,255,.45);margin-bottom:.6rem; }
    .footer-links { display:flex;flex-direction:column;gap:.35rem; }
    .footer-links a, .footer-links span { color:rgba(255,255,255,.65);font-size:.875rem;text-decoration:none;transition:color .15s; }
    .footer-links a:hover { color:var(--nb-accent); }
  `]
})
export class AppComponent {
  navOpen = signal(false);

  isLoggedIn  = this.auth.isLoggedIn;
  isAdmin     = computed(() => this.auth.userRole() === 'admin');
  currentUser = this.auth.currentUser;

  dashboardRoute = computed(() =>
    this.auth.userRole() === 'provider' ? '/dashboard/provider' : '/dashboard/customer'
  );

  constructor(
    public auth:         AuthService,
    public toastService: ToastService,
    private router:      Router,
  ) {}

  logout() {
    this.auth.logout();
    this.router.navigate(['/']);
  }
}
