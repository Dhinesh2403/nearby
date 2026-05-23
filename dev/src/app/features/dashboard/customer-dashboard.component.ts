// src/app/features/dashboard/customer-dashboard.component.ts
import { Component, OnInit, signal } from '@angular/core';
import { CommonModule }  from '@angular/common';
import { RouterLink }    from '@angular/router';
import { AuthService }   from '../../core/auth/auth.service';
import { ApiService, Booking, ApiResponse } from '../../core/services/api.service';
import { ToastService }  from '../../core/services/toast.service';

@Component({
  selector: 'app-customer-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <div class="container py-4">

      <!-- Header -->
      <div class="dash-hdr mb-4" data-testid="dashboard-welcome">
        <div>
          <h2 class="section-title">Welcome back, {{ firstName() }}! 👋</h2>
          <p class="section-sub mb-0">Here's what's happening with your bookings</p>
        </div>
        <a routerLink="/browse" class="btn-nb-primary btn">
          <i class="bi bi-plus me-1"></i>New Booking
        </a>
      </div>

      <!-- KPIs -->
      <div class="kpi-grid mb-4">
        @for (k of kpis(); track k.label) {
          <div class="kpi-card">
            <div class="kpi-icon" [style.background]="k.bg">
              <i class="bi" [class]="k.icon" [style.color]="k.ic"></i>
            </div>
            <div>
              <p class="kpi-num">{{ k.val }}</p>
              <p class="kpi-lbl">{{ k.label }}</p>
            </div>
          </div>
        }
      </div>

      <div class="row g-4">

        <!-- Active Bookings -->
        <div class="col-md-8" data-testid="active-bookings-section">
          <div class="ds-card">
            <div class="ds-hdr">
              <h6 class="ds-title">Active Bookings</h6>
              <span class="nb-badge nb-badge-primary">{{ activeBookings().length }}</span>
            </div>
            @if (loadingBookings()) {
              <div class="text-center py-3"><div class="nb-spinner" style="margin:auto"></div></div>
            } @else if (activeBookings().length === 0) {
              <p class="text-muted-nb text-center py-3" style="font-size:.875rem">
                No active bookings. <a routerLink="/browse">Find a provider →</a>
              </p>
            } @else {
              @for (b of activeBookings(); track b._id) {
                <div class="bk-row" data-testid="booking-card">
                  <div class="bk-av" [style.background]="providerColor(b.providerId?.category)">
                    {{ (b.providerId?.businessName || 'P').charAt(0) }}
                  </div>
                  <div class="flex-grow-1">
                    <p class="bk-prov">{{ b.providerId?.businessName || 'Provider' }}</p>
                    <p class="bk-meta">
                      <i class="bi bi-calendar3 me-1"></i>
                      {{ b.scheduledDate | date:'dd MMM yyyy' }} · {{ b.scheduledTime }}
                      @if (b.bookingType === 'remote') {
                        · <i class="bi bi-camera-video ms-1"></i> Online
                      }
                    </p>
                  </div>
                  <div class="d-flex flex-column align-items-end gap-1">
                    <span class="nb-badge" [class]="statusClass(b.status)" data-testid="booking-status">
                      {{ b.status | titlecase }}
                    </span>
                    @if (['pending','accepted'].includes(b.status)) {
                      <button class="cancel-btn" (click)="cancelBooking(b._id)">Cancel</button>
                    }
                    @if (b.status === 'accepted' && b.bookingType === 'remote' && b.meetingLink) {
                      <a [href]="b.meetingLink" target="_blank" class="join-btn">
                        <i class="bi bi-camera-video me-1"></i>Join
                      </a>
                    }
                  </div>
                </div>
              }
            }
          </div>
        </div>

        <!-- Right column -->
        <div class="col-md-4">

          <!-- History -->
          <div class="ds-card mb-3" data-testid="booking-history-section">
            <div class="ds-hdr"><h6 class="ds-title">Recent History</h6></div>
            @if (completedBookings().length === 0) {
              <p class="text-muted-nb text-center py-2" style="font-size:.8rem">No completed bookings yet.</p>
            }
            @for (b of completedBookings().slice(0,4); track b._id) {
              <div class="hist-row">
                <div>
                  <p class="bk-prov mb-0" style="font-size:.875rem">{{ b.providerId?.businessName || 'Provider' }}</p>
                  <p class="bk-meta mb-0">{{ b.scheduledDate | date:'MMM yyyy' }}</p>
                </div>
                <span class="nb-badge nb-badge-success">Done</span>
              </div>
            }
          </div>

          <!-- Quick actions -->
          <div class="ds-card">
            <div class="ds-hdr"><h6 class="ds-title">Quick Actions</h6></div>
            <div class="qa-grid">
              <a routerLink="/browse" class="qa-item">
                <i class="bi bi-search"></i><span>Find Services</span>
              </a>
              <a routerLink="/browse" [queryParams]="{category:'home_services'}" class="qa-item">
                <i class="bi bi-tools"></i><span>Home Repair</span>
              </a>
              <a routerLink="/browse" [queryParams]="{category:'education'}" class="qa-item">
                <i class="bi bi-mortarboard"></i><span>Find Tutor</span>
              </a>
              <a routerLink="/complaints/new" class="qa-item">
                <i class="bi bi-flag"></i><span>Raise Issue</span>
              </a>
            </div>
          </div>
        </div>

      </div>
    </div>
  `,
  styles: [`
    .dash-hdr { display:flex; justify-content:space-between; align-items:flex-start; flex-wrap:wrap; gap:12px; }
    .kpi-grid { display:grid; grid-template-columns:repeat(auto-fill,minmax(175px,1fr)); gap:12px; }
    .kpi-card { background:#fff; border:1px solid var(--nb-border); border-radius:var(--radius-lg); padding:1.25rem; display:flex; align-items:center; gap:14px; }
    .kpi-icon { width:44px; height:44px; border-radius:var(--radius-md); display:flex; align-items:center; justify-content:center; font-size:1.25rem; flex-shrink:0; }
    .kpi-num  { font-family:var(--font-display); font-size:1.5rem; font-weight:800; margin:0; }
    .kpi-lbl  { font-size:.72rem; text-transform:uppercase; letter-spacing:.05em; color:var(--nb-text-muted); margin:0; }
    .ds-card  { background:#fff; border:1px solid var(--nb-border); border-radius:var(--radius-lg); padding:1.25rem; }
    .ds-hdr   { display:flex; justify-content:space-between; align-items:center; margin-bottom:1rem; }
    .ds-title { font-family:var(--font-display); font-weight:700; margin:0; font-size:.95rem; }
    .bk-row   { display:flex; align-items:center; gap:12px; padding:10px 0; border-bottom:1px solid var(--nb-border); }
    .bk-row:last-child { border-bottom:none; }
    .bk-av    { width:38px; height:38px; min-width:38px; border-radius:10px; display:flex; align-items:center; justify-content:center; font-family:var(--font-display); font-weight:700; color:#fff; }
    .bk-prov  { font-family:var(--font-display); font-weight:600; font-size:.875rem; margin:0; }
    .bk-meta  { font-size:.75rem; color:var(--nb-text-muted); margin:0; }
    .cancel-btn { background:none; border:none; color:var(--nb-danger); font-size:.72rem; cursor:pointer; padding:0; }
    .join-btn { background:#D1FAE5; color:#065f46; border-radius:6px; padding:3px 10px; font-size:.72rem; font-weight:600; font-family:var(--font-display); text-decoration:none; }
    .hist-row { display:flex; justify-content:space-between; align-items:center; padding:8px 0; border-bottom:1px solid var(--nb-border); }
    .hist-row:last-child { border-bottom:none; }
    .qa-grid  { display:grid; grid-template-columns:1fr 1fr; gap:8px; }
    .qa-item  { display:flex; flex-direction:column; align-items:center; gap:6px; padding:14px; background:var(--nb-surface-2); border-radius:var(--radius-md); text-decoration:none; color:var(--nb-text); font-family:var(--font-display); font-size:.75rem; font-weight:600; text-transform:uppercase; letter-spacing:.04em; transition:all .2s; }
    .qa-item i { font-size:1.25rem; color:var(--nb-primary); }
    .qa-item:hover { background:#EFF6FF; color:var(--nb-primary); }
  `]
})
export class CustomerDashboardComponent implements OnInit {
  allBookings       = signal<Booking[]>([]);
  loadingBookings   = signal(true);

  activeBookings    = signal<Booking[]>([]);
  completedBookings = signal<Booking[]>([]);
  kpis              = signal<any[]>([]);

  constructor(
    public auth:   AuthService,
    private api:   ApiService,
    private toast: ToastService,
  ) {}

  firstName() { return this.auth.currentUser()?.name?.split(' ')[0] ?? ''; }

  ngOnInit() {
    this.api.get<any>('/bookings').subscribe({
      next: res => {
        const all: Booking[] = res.data ?? [];
        this.allBookings.set(all);
        this.activeBookings.set(all.filter(b => ['pending','accepted','in_progress'].includes(b.status)));
        this.completedBookings.set(all.filter(b => b.status === 'completed'));
        this.kpis.set([
          { label:'Total Bookings', val: all.length,                            icon:'bi-calendar-check', bg:'#EFF6FF', ic:'#2563A8' },
          { label:'Completed',      val: all.filter(b=>b.status==='completed').length, icon:'bi-check-circle', bg:'#D1FAE5', ic:'#059669' },
          { label:'Pending',        val: all.filter(b=>b.status==='pending').length,   icon:'bi-clock',        bg:'#FEF3C7', ic:'#D97706' },
          { label:'Cancelled',      val: all.filter(b=>b.status==='cancelled').length, icon:'bi-x-circle',     bg:'#FEE2E2', ic:'#DC2626' },
        ]);
        this.loadingBookings.set(false);
      },
      error: () => {
        this.loadingBookings.set(false);
        this.kpis.set([
          { label:'Total Bookings', val:0, icon:'bi-calendar-check', bg:'#EFF6FF', ic:'#2563A8' },
          { label:'Completed',      val:0, icon:'bi-check-circle',   bg:'#D1FAE5', ic:'#059669' },
          { label:'Pending',        val:0, icon:'bi-clock',          bg:'#FEF3C7', ic:'#D97706' },
          { label:'Cancelled',      val:0, icon:'bi-x-circle',       bg:'#FEE2E2', ic:'#DC2626' },
        ]);
      },
    });
  }

  cancelBooking(id: string) {
    if (!confirm('Cancel this booking?')) return;
    this.api.put<any>(`/bookings/${id}/cancel`, { reason: 'Cancelled by customer' }).subscribe({
      next: () => {
        this.toast.success('Booking cancelled.');
        this.ngOnInit();
      },
      error: () => this.toast.error('Could not cancel booking.'),
    });
  }

  statusClass(s: string) {
    if (s === 'accepted')    return 'nb-badge nb-badge-success';
    if (s === 'pending')     return 'nb-badge nb-badge-warning';
    if (s === 'rejected')    return 'nb-badge nb-badge-danger';
    if (s === 'cancelled')   return 'nb-badge nb-badge-danger';
    if (s === 'completed')   return 'nb-badge nb-badge-success';
    if (s === 'in_progress') return 'nb-badge nb-badge-primary';
    return 'nb-badge nb-badge-muted';
  }

  providerColor(cat: string) {
    const m: Record<string,string> = { home_services:'#2563A8', education:'#059669', food:'#D97706', wellness:'#7C3AED', events:'#DC2626' };
    return m[cat] ?? '#1A3C5E';
  }
}
