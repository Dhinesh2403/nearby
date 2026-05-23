// src/app/features/dashboard/provider-dashboard.component.ts
import { Component, OnInit, signal } from '@angular/core';
import { CommonModule }  from '@angular/common';
import { RouterLink }    from '@angular/router';
import { AuthService }   from '../../core/auth/auth.service';
import { ApiService, Booking } from '../../core/services/api.service';
import { ToastService }  from '../../core/services/toast.service';

@Component({
  selector: 'app-provider-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <div class="container py-4">

      <div class="d-flex justify-content-between align-items-center mb-4 flex-wrap gap-2">
        <div>
          <h2 class="section-title">Provider Dashboard</h2>
          <p class="section-sub mb-0">{{ auth.currentUser()?.name }}</p>
        </div>
        <a routerLink="/browse" class="btn-nb-outline btn btn-sm">
          <i class="bi bi-eye me-1"></i>View My Profile
        </a>
      </div>

      <!-- KPIs -->
      <div class="kpi-grid mb-4">
        @for (k of kpis(); track k.label) {
          <div class="kpi-card">
            <div class="kpi-icon" [style.background]="k.bg"><i class="bi" [class]="k.icon" [style.color]="k.ic"></i></div>
            <div><p class="kpi-num">{{ k.val }}</p><p class="kpi-lbl">{{ k.label }}</p></div>
          </div>
        }
      </div>

      <div class="row g-4">

        <!-- Pending Requests -->
        <div class="col-md-7" data-testid="pending-requests-section">
          <div class="ds-card">
            <div class="ds-hdr">
              <h6 class="ds-title">New Booking Requests</h6>
              <span class="nb-badge nb-badge-warning">{{ pendingBookings().length }} pending</span>
            </div>
            @if (loadingBookings()) {
              <div class="text-center py-3"><div class="nb-spinner" style="margin:auto"></div></div>
            } @else if (pendingBookings().length === 0) {
              <p class="text-muted-nb text-center py-3" style="font-size:.875rem">No pending requests.</p>
            } @else {
              @for (b of pendingBookings(); track b._id) {
                <div class="bk-row" data-testid="booking-request-card">
                  <div class="bk-av" style="background:#2563A8">
                    {{ (b.customerId?.name || 'C').charAt(0) }}
                  </div>
                  <div class="flex-grow-1">
                    <p class="bk-prov">{{ b.customerId?.name || 'Customer' }}</p>
                    <p class="bk-meta">
                      {{ b.scheduledDate | date:'dd MMM' }} · {{ b.scheduledTime }}
                      @if (b.bookingType === 'remote') { · <i class="bi bi-camera-video ms-1"></i> Online }
                    </p>
                    @if (b.notes) { <p class="bk-notes">"{{ b.notes }}"</p> }
                  </div>
                  <div class="d-flex gap-2">
                    <button class="act-btn accept" (click)="accept(b._id)">
                      <i class="bi bi-check-lg"></i>Accept
                    </button>
                    <button class="act-btn reject" (click)="reject(b._id)">
                      <i class="bi bi-x-lg"></i>Reject
                    </button>
                  </div>
                </div>
              }
            }
          </div>

          <!-- Upcoming -->
          <div class="ds-card mt-3">
            <div class="ds-hdr"><h6 class="ds-title">Upcoming Jobs</h6></div>
            @if (upcomingBookings().length === 0) {
              <p class="text-muted-nb text-center py-2" style="font-size:.8rem">No upcoming jobs.</p>
            }
            @for (b of upcomingBookings(); track b._id) {
              <div class="bk-row">
                <div class="bk-av" style="background:#059669">{{ (b.customerId?.name || 'C').charAt(0) }}</div>
                <div class="flex-grow-1">
                  <p class="bk-prov">{{ b.customerId?.name || 'Customer' }}</p>
                  <p class="bk-meta">{{ b.scheduledDate | date:'dd MMM' }} · {{ b.scheduledTime }}</p>
                </div>
                <div class="d-flex gap-2">
                  <span class="nb-badge nb-badge-success">Accepted</span>
                  <button class="act-btn complete" (click)="complete(b._id)">
                    <i class="bi bi-check2-all"></i>Done
                  </button>
                </div>
              </div>
            }
          </div>
        </div>

        <!-- Right column -->
        <div class="col-md-5">

          <!-- Rating -->
          <div class="ds-card mb-3" data-testid="rating-overview">
            <div class="ds-hdr"><h6 class="ds-title">Rating Overview</h6></div>
            <div class="d-flex align-items-center gap-3 mb-3">
              <div style="font-family:var(--font-display);font-size:2.5rem;font-weight:800;color:var(--nb-primary);line-height:1">
                {{ avgRating() }}
              </div>
              <div>
                <div style="color:var(--nb-accent);font-size:1.1rem;letter-spacing:2px" data-testid="rating-average">
                  {{ starStr(avgRating()) }}
                </div>
                <p style="font-size:.75rem;color:var(--nb-text-muted);margin:0">
                  Based on {{ totalRatings() }} reviews
                </p>
              </div>
            </div>
          </div>

          <!-- Profile completeness -->
          <div class="ds-card mb-3" data-testid="profile-completeness">
            <div class="ds-hdr"><h6 class="ds-title">Profile</h6></div>
            <div class="prog-track">
              <div class="prog-fill" [style.width]="'75%'"></div>
            </div>
            <p style="font-size:.78rem;color:var(--nb-text-muted);margin-top:6px">
              75% — Add ID proof to reach 100%
            </p>
          </div>

          <!-- Quick links -->
          <div class="ds-card">
            <div class="ds-hdr"><h6 class="ds-title">Quick Links</h6></div>
            <div class="ql-list">
              <a routerLink="/browse" class="ql-item"><i class="bi bi-eye"></i>View My Public Profile</a>
              <a routerLink="/complaints/new" class="ql-item"><i class="bi bi-flag"></i>Raise a Complaint</a>
            </div>
          </div>
        </div>

      </div>
    </div>
  `,
  styles: [`
    .kpi-grid { display:grid; grid-template-columns:repeat(auto-fill,minmax(160px,1fr)); gap:12px; }
    .kpi-card { background:#fff; border:1px solid var(--nb-border); border-radius:var(--radius-lg); padding:1.1rem; display:flex; align-items:center; gap:12px; }
    .kpi-icon { width:40px; height:40px; border-radius:var(--radius-md); display:flex; align-items:center; justify-content:center; font-size:1.1rem; flex-shrink:0; }
    .kpi-num  { font-family:var(--font-display); font-size:1.4rem; font-weight:800; margin:0; }
    .kpi-lbl  { font-size:.7rem; text-transform:uppercase; letter-spacing:.05em; color:var(--nb-text-muted); margin:0; }
    .ds-card  { background:#fff; border:1px solid var(--nb-border); border-radius:var(--radius-lg); padding:1.25rem; }
    .ds-hdr   { display:flex; justify-content:space-between; align-items:center; margin-bottom:1rem; }
    .ds-title { font-family:var(--font-display); font-weight:700; margin:0; font-size:.95rem; }
    .bk-row   { display:flex; align-items:flex-start; gap:12px; padding:10px 0; border-bottom:1px solid var(--nb-border); }
    .bk-row:last-child { border-bottom:none; }
    .bk-av    { width:36px; height:36px; min-width:36px; border-radius:10px; display:flex; align-items:center; justify-content:center; font-family:var(--font-display); font-weight:700; color:#fff; }
    .bk-prov  { font-family:var(--font-display); font-weight:600; font-size:.875rem; margin:0; }
    .bk-meta  { font-size:.75rem; color:var(--nb-text-muted); margin:2px 0 0; }
    .bk-notes { font-size:.75rem; color:var(--nb-text-muted); font-style:italic; margin:4px 0 0; }
    .act-btn  { border:none; border-radius:var(--radius-sm); padding:5px 12px; font-family:var(--font-display); font-size:.75rem; font-weight:700; cursor:pointer; display:flex; align-items:center; gap:4px; transition:all .15s; white-space:nowrap; }
    .act-btn.accept   { background:#D1FAE5; color:#065f46; }
    .act-btn.accept:hover { background:#A7F3D0; }
    .act-btn.reject   { background:#FEE2E2; color:#991b1b; }
    .act-btn.reject:hover { background:#FECACA; }
    .act-btn.complete { background:#DBEAFE; color:#1e40af; }
    .act-btn.complete:hover { background:#BFDBFE; }
    .prog-track { height:8px; background:var(--nb-surface-2); border-radius:4px; overflow:hidden; }
    .prog-fill  { height:100%; background:linear-gradient(90deg,var(--nb-primary),var(--nb-primary-light)); border-radius:4px; }
    .ql-list { display:flex; flex-direction:column; gap:6px; }
    .ql-item { display:flex; align-items:center; gap:10px; padding:10px 12px; background:var(--nb-surface-2); border-radius:var(--radius-md); color:var(--nb-text); text-decoration:none; font-size:.875rem; transition:background .15s; }
    .ql-item i { color:var(--nb-primary); }
    .ql-item:hover { background:#EFF6FF; }
  `]
})
export class ProviderDashboardComponent implements OnInit {
  allBookings      = signal<Booking[]>([]);
  pendingBookings  = signal<Booking[]>([]);
  upcomingBookings = signal<Booking[]>([]);
  loadingBookings  = signal(true);
  kpis             = signal<any[]>([]);
  avgRating        = signal(0);
  totalRatings     = signal(0);

  constructor(public auth: AuthService, private api: ApiService, private toast: ToastService) {}

  ngOnInit() { this.loadBookings(); }

  loadBookings() {
    this.loadingBookings.set(true);
    this.api.get<any>('/bookings').subscribe({
      next: res => {
        const all: Booking[] = res.data ?? [];
        this.allBookings.set(all);
        this.pendingBookings.set(all.filter(b => b.status === 'pending'));
        this.upcomingBookings.set(all.filter(b => b.status === 'accepted'));
        this.kpis.set([
          { label:'Total Jobs',  val: all.filter(b=>b.status==='completed').length, icon:'bi-calendar-check', bg:'#EFF6FF', ic:'#2563A8' },
          { label:'This Month',  val: all.filter(b => { const d = new Date(b.scheduledDate); const n = new Date(); return d.getMonth()===n.getMonth() && d.getFullYear()===n.getFullYear(); }).length, icon:'bi-graph-up', bg:'#D1FAE5', ic:'#059669' },
          { label:'Pending',     val: all.filter(b=>b.status==='pending').length,   icon:'bi-clock',         bg:'#FEF3C7', ic:'#D97706' },
          { label:'Upcoming',    val: all.filter(b=>b.status==='accepted').length,  icon:'bi-calendar2',     bg:'#EDE9FE', ic:'#7C3AED' },
        ]);
        this.loadingBookings.set(false);
      },
      error: () => { this.loadingBookings.set(false); },
    });

    // Load provider profile for rating
    this.api.get<any>('/providers/my').subscribe({
      next: res => {
        this.avgRating.set(res.data?.ratingAvg ?? 0);
        this.totalRatings.set(res.data?.ratingCount ?? 0);
      },
    });
  }

  accept(id: string) {
    this.api.put<any>(`/bookings/${id}/accept`, {}).subscribe({
      next: () => { this.toast.success('Booking accepted.'); this.loadBookings(); },
      error: () => this.toast.error('Could not accept booking.'),
    });
  }

  reject(id: string) {
    const reason = prompt('Reason for rejection (optional):') ?? '';
    this.api.put<any>(`/bookings/${id}/reject`, { reason }).subscribe({
      next: () => { this.toast.success('Booking rejected.'); this.loadBookings(); },
      error: () => this.toast.error('Could not reject booking.'),
    });
  }

  complete(id: string) {
    if (!confirm('Mark this booking as completed?')) return;
    this.api.put<any>(`/bookings/${id}/complete`, {}).subscribe({
      next: () => { this.toast.success('Booking marked as completed!'); this.loadBookings(); },
      error: () => this.toast.error('Could not complete booking.'),
    });
  }

  starStr(r: number) { return '★'.repeat(Math.round(r)) + '☆'.repeat(5 - Math.round(r)); }
}
