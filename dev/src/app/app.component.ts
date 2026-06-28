import { Component, signal, computed, effect, HostListener } from '@angular/core';
import { RouterOutlet, RouterLink, RouterLinkActive, Router } from '@angular/router';
import { CommonModule }  from '@angular/common';
import { AuthService }   from './core/auth/auth.service';
import { ToastService }  from './core/services/toast.service';
import { NotificationService } from './core/services/notification.service';
import { ChatService }   from './core/services/chat.service';
import { SettingsService } from './core/services/settings.service';
import { ConfirmDialogComponent } from './shared/components/confirm-dialog.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive, CommonModule, ConfirmDialogComponent],
  template: `
    <!-- NAVBAR -->
    <nav class="navbar navbar-expand-lg nb-navbar sticky-top">
      <div class="container">
        <a class="navbar-brand nb-brand" routerLink="/">
          <img src="assets/brand/logo.svg" alt="NearbyPro" class="nb-logo" height="38" />
        </a>

        <button class="navbar-toggler border-0" type="button"
                (click)="$event.stopPropagation(); navOpen.set(!navOpen())">
          <i class="bi" [class.bi-list]="!navOpen()" [class.bi-x]="navOpen()"></i>
        </button>

        <div class="collapse navbar-collapse" [class.show]="navOpen()">
          <ul class="navbar-nav me-auto gap-1">
            <li class="nav-item">
              <a class="nav-link" routerLink="/"
                 routerLinkActive="active" [routerLinkActiveOptions]="{exact:true}">Home</a>
            </li>
            @if (!isAdmin()) {
              <li class="nav-item">
                <a class="nav-link" routerLink="/browse" routerLinkActive="active">Browse</a>
              </li>
            }
            @if (!isAdmin()) {
              <li class="nav-item">
                <a class="nav-link" routerLink="/how-it-works" routerLinkActive="active">How It Works</a>
              </li>
              <li class="nav-item">
                <a class="nav-link" routerLink="/blog" routerLinkActive="active">Blog</a>
              </li>
              <li class="nav-item">
                <a class="nav-link" routerLink="/about" routerLinkActive="active">About</a>
              </li>
            }
            @if (isLoggedIn() && !isAdmin()) {
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
              <a routerLink="/provider-signup" class="btn-nb-outline btn btn-sm d-none d-sm-inline-flex">
                <i class="bi bi-briefcase me-1"></i>Become a Provider
              </a>
              <a routerLink="/auth/login" class="btn-nb-primary btn btn-sm">Login</a>
            } @else {
              <!-- CHAT -->
              <a routerLink="/chats" class="bell-btn" aria-label="Messages" style="text-decoration:none">
                <i class="bi bi-chat-dots"></i>
                @if (chat.unreadTotal() > 0) {
                  <span class="bell-badge">{{ chat.unreadTotal() > 9 ? '9+' : chat.unreadTotal() }}</span>
                }
              </a>

              <!-- NOTIFICATION BELL -->
              <div class="dropdown" [class.show]="bellOpen()" (click)="$event.stopPropagation()">
                <button class="bell-btn" type="button" (click)="toggleBell()" aria-label="Notifications">
                  <i class="bi bi-bell"></i>
                  @if (notif.unread() > 0) {
                    <span class="bell-badge">{{ notif.unread() > 9 ? '9+' : notif.unread() }}</span>
                  }
                </button>
                <ul class="dropdown-menu dropdown-menu-end shadow border-0 mt-1 notif-menu"
                    [class.show]="bellOpen()">
                  <li class="notif-head">
                    <span class="fw-display">Notifications</span>
                    @if (notif.unread() > 0) {
                      <button class="notif-clear" (click)="notif.markAllRead()">Mark all read</button>
                    }
                  </li>
                  @if (notif.notifications().length === 0) {
                    <li class="notif-empty">
                      <i class="bi bi-bell-slash d-block mb-1" style="font-size:1.3rem"></i>
                      No notifications yet
                    </li>
                  } @else {
                    @for (n of notif.notifications(); track n._id) {
                      <li>
                        <a class="notif-item" [class.unread]="!n.isRead"
                           style="cursor:pointer" (click)="openNotif(n)">
                          <div class="notif-dot" [class.on]="!n.isRead"></div>
                          <div class="flex-grow-1">
                            <p class="notif-title">{{ n.title }}</p>
                            <p class="notif-body">{{ n.body }}</p>
                            <p class="notif-time">{{ n.createdAt | date:'dd MMM, h:mm a' }}</p>
                          </div>
                        </a>
                      </li>
                    }
                  }
                </ul>
              </div>

              <div class="dropdown" [class.show]="menuOpen()" (click)="$event.stopPropagation()">
                <button class="btn d-flex align-items-center gap-2 px-3 py-2 rounded-3"
                        type="button"
                        style="background:var(--nb-surface-2);border:1px solid var(--nb-border)"
                        [attr.aria-expanded]="menuOpen()"
                        (click)="menuOpen.set(!menuOpen())">
                  <div class="u-avatar">{{ currentUser()?.name?.charAt(0)?.toUpperCase() }}</div>
                  <span class="fw-display" style="font-size:.875rem;font-weight:600">
                    {{ (currentUser()?.name || '').split(' ')[0] }}
                  </span>
                  <i class="bi bi-chevron-down" style="font-size:.7rem"></i>
                </button>
                <ul class="dropdown-menu dropdown-menu-end shadow border-0 mt-1"
                    [class.show]="menuOpen()">
                  <li>
                    <a class="dropdown-item" [routerLink]="dashboardRoute()" (click)="menuOpen.set(false)">
                      <i class="bi bi-speedometer2 me-2"></i>Dashboard
                    </a>
                  </li>
                  <li>
                    <a class="dropdown-item" routerLink="/settings" (click)="menuOpen.set(false)">
                      <i class="bi bi-gear me-2"></i>Settings
                    </a>
                  </li>
                  <li><hr class="dropdown-divider"></li>
                  <li>
                    <button class="dropdown-item text-danger" type="button" (click)="logout()">
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
              <img src="assets/brand/logo-white.svg" alt="NearbyPro" height="42"
                 style="margin-bottom:.5rem; display:block" />
            <p style="color:rgba(255,255,255,.6);font-size:.875rem">
              Connecting your city, one service at a time.
            </p>
          </div>
          <div class="col-6 col-md-2">
            <p class="footer-heading">Platform</p>
            <div class="footer-links">
              <a routerLink="/browse">Browse</a>
              <a routerLink="/how-it-works">How It Works</a>
              <a routerLink="/auth/login" [queryParams]="{mode:'signup'}">Sign Up</a>
            </div>
          </div>
          <div class="col-6 col-md-2">
            <p class="footer-heading">Company</p>
            <div class="footer-links">
              <a routerLink="/about">About</a>
              <a routerLink="/blog">Blog</a>
              <a routerLink="/faq">FAQ</a>
            </div>
          </div>
          <div class="col-6 col-md-2">
            <p class="footer-heading">Legal</p>
            <div class="footer-links">
              <a routerLink="/terms">Terms of Service</a>
              <a routerLink="/privacy">Privacy Policy</a>
            </div>
          </div>
          <div class="col-6 col-md-2">
            <p class="footer-heading">Contact</p>
            <div class="footer-links">
              <span>admin&#64;nearbypro.online</span>
              <span>Coimbatore, India</span>
            </div>
          </div>
        </div>
        <div class="footer-bottom">
          <span>© 2026 NearbyPro. All rights reserved.</span>
          <span class="footer-legal">
            <a routerLink="/terms">Terms &amp; Conditions</a>
            <a routerLink="/privacy">Privacy Policy</a>
          </span>
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

    <!-- GLOBAL MODAL DIALOGS (confirm / prompt) -->
    <app-confirm-dialog />
  `,
  styles: [`
    .bell-btn { position:relative;background:var(--nb-surface-2);border:1px solid var(--nb-border);width:40px;height:40px;border-radius:10px;display:flex;align-items:center;justify-content:center;font-size:1.05rem;color:var(--nb-text);cursor:pointer;transition:background .15s; }
    .bell-btn:hover { background:var(--nb-bg); }
    .bell-badge { position:absolute;top:-5px;right:-5px;background:var(--nb-danger);color:#fff;border-radius:20px;min-width:18px;height:18px;padding:0 4px;font-size:.65rem;font-weight:700;display:flex;align-items:center;justify-content:center;font-family:var(--font-display); }
    .notif-menu { position:absolute;right:0;left:auto;top:calc(100% + 8px);width:min(360px,92vw);max-height:70vh;overflow-y:auto;padding:0;border-radius:14px;border:1px solid var(--nb-border)!important;z-index:1040; }
    .notif-head { display:flex;justify-content:space-between;align-items:center;padding:12px 16px;border-bottom:1px solid var(--nb-border);font-weight:700;font-size:.9rem;position:sticky;top:0;background:#fff;z-index:1; }
    .notif-clear { background:none;border:none;color:var(--nb-primary);font-size:.75rem;font-weight:600;cursor:pointer;font-family:var(--font-display);white-space:nowrap; }
    .notif-empty { text-align:center;color:var(--nb-text-muted);padding:2rem 1rem;font-size:.85rem; }
    .notif-item { display:flex;gap:10px;padding:12px 16px;border-bottom:1px solid var(--nb-border);text-decoration:none;color:var(--nb-text);transition:background .12s; }
    .notif-item:last-child { border-bottom:none; }
    .notif-item:hover { background:var(--nb-surface-2); }
    .notif-item.unread { background:#F5F9FF;box-shadow:inset 3px 0 0 var(--nb-primary); }
    .notif-dot { width:8px;height:8px;border-radius:50%;margin-top:5px;flex-shrink:0;background:transparent; }
    .notif-dot.on { background:var(--nb-primary); }
    .notif-body  { white-space:normal;word-break:break-word; }
    .notif-title { font-family:var(--font-display);font-weight:700;font-size:.82rem;margin:0; }
    .notif-body  { font-size:.78rem;color:var(--nb-text-muted);margin:2px 0 0;line-height:1.35; }
    .notif-time  { font-size:.7rem;color:var(--nb-text-muted);margin:4px 0 0; }
    .nb-brand { text-decoration:none; display:flex; align-items:center; }
    .nb-logo { height:38px; width:auto; display:block; }
    .u-avatar { width:28px;height:28px;background:var(--nb-primary);color:#fff;border-radius:50%;display:flex;align-items:center;justify-content:center;font-family:var(--font-display);font-weight:700;font-size:.8rem; }
    /* Right-align navbar dropdowns reliably without Bootstrap JS/Popper */
    .dropdown-menu-end.show { position:absolute;right:0;left:auto;top:calc(100% + 6px);z-index:1040; }
    .dropdown-item { font-size:.875rem;padding:.5rem 1rem; }
    .dropdown-item:hover { background:var(--nb-surface-2); }
    .footer-heading { font-family:var(--font-display);font-weight:700;font-size:.78rem;text-transform:uppercase;letter-spacing:.05em;color:rgba(255,255,255,.45);margin-bottom:.6rem; }
    .footer-links { display:flex;flex-direction:column;gap:.35rem; }
    .footer-links a, .footer-links span { color:rgba(255,255,255,.65);font-size:.875rem;text-decoration:none;transition:color .15s; }
    .footer-links a:hover { color:var(--nb-accent); }
    .footer-bottom { border-top:1px solid rgba(255,255,255,.1);padding-top:1rem;color:rgba(255,255,255,.4);font-size:.8rem;display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:.5rem; }
    .footer-legal { display:flex;gap:1.25rem; }
    .footer-legal a { color:rgba(255,255,255,.55);text-decoration:none;transition:color .15s; }
    .footer-legal a:hover { color:var(--nb-accent); }
    @media (max-width:576px) { .footer-bottom { justify-content:center;text-align:center; } }
  `]
})
export class AppComponent {
  navOpen  = signal(false);
  menuOpen = signal(false);
  bellOpen = signal(false);

  isLoggedIn  = this.auth.isLoggedIn;
  isAdmin     = computed(() => this.auth.userRole() === 'admin');
  currentUser = this.auth.currentUser;

  dashboardRoute = computed(() => {
    switch (this.auth.userRole()) {
      case 'admin':    return '/admin';
      case 'provider': return '/dashboard/provider';
      default:         return '/dashboard/customer';
    }
  });

  constructor(
    public auth:         AuthService,
    public toastService: ToastService,
    public notif:        NotificationService,
    public chat:         ChatService,
    private router:      Router,
    private settings:    SettingsService,
  ) {
    this.settings.load();

    // Poll for notifications + chat unread while logged in; clear on logout.
    // allowSignalWrites: start()/stop() reset unread-count signals synchronously.
    effect(() => {
      if (this.auth.isLoggedIn()) { this.notif.start(); this.chat.start(); }
      else                        { this.notif.stop();  this.chat.stop(); }
    }, { allowSignalWrites: true });
  }

  // Close any open menu/nav when clicking anywhere outside it
  @HostListener('document:click')
  closeMenu() { this.menuOpen.set(false); this.bellOpen.set(false); this.navOpen.set(false); }

  toggleBell() {
    this.menuOpen.set(false);
    const opening = !this.bellOpen();
    this.bellOpen.set(opening);
    if (opening) this.notif.load();
  }

  // Clicking a notification: close the panel, mark read, and follow its link
  // (navigateByUrl preserves query strings like /admin?tab=complaints).
  openNotif(n?: { link?: string }) {
    this.bellOpen.set(false);
    this.notif.markAllRead();
    if (n?.link) this.router.navigateByUrl(n.link);
  }

  logout() {
    this.menuOpen.set(false);
    this.auth.logout();
    this.router.navigate(['/']);
  }
}
