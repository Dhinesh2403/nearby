// src/app/features/booking/booking-form.component.ts
import { Component, OnInit, signal } from '@angular/core';
import { CommonModule }   from '@angular/common';
import { FormsModule }    from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { ApiService, ApiResponse, Provider } from '../../core/services/api.service';
import { AuthService }    from '../../core/auth/auth.service';
import { ToastService }   from '../../core/services/toast.service';

@Component({
  selector: 'app-booking-form',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  template: `
    <div class="container py-4" style="max-width:720px">

      <nav class="mb-3" style="font-size:.8rem;color:var(--nb-text-muted)">
        <a routerLink="/browse" style="color:var(--nb-text-muted)">Browse</a>
        <span class="mx-2">›</span>
        <a [routerLink]="['/provider',form.providerId]" style="color:var(--nb-text-muted)">Provider</a>
        <span class="mx-2">›</span>
        <span style="color:var(--nb-text)">Book Service</span>
      </nav>

      <h2 class="section-title mb-1">Confirm Your Booking</h2>
      <p class="section-sub mb-4">Review details before sending your request</p>

      @if (success()) {
        <div class="success-card">
          <div class="success-icon"><i class="bi bi-check-circle-fill"></i></div>
          <h4>Booking Request Sent!</h4>
          <p>Your request has been sent to <strong>{{ providerName }}</strong>.</p>
          <p style="font-size:.85rem;color:var(--nb-text-muted)">They will respond shortly. Check your dashboard for updates.</p>
          <div class="d-flex gap-2 justify-content-center mt-3">
            <a routerLink="/dashboard/customer" class="btn-nb-primary btn">Go to Dashboard</a>
            <a routerLink="/browse" class="btn-nb-outline btn">Browse More</a>
          </div>
        </div>
      } @else {
        <div class="row g-4">
          <div class="col-md-7">
            <div class="form-card">

              <!-- Provider info -->
              <h6 class="fs-title">Provider</h6>
              <div class="prov-mini">
                <div class="pm-av" [style.background]="providerColor">{{ providerName.charAt(0) }}</div>
                <div>
                  <p class="pm-name">{{ providerName }}</p>
                  <p class="pm-sub">{{ providerSub }}</p>
                </div>
              </div>

              <hr class="divider">

              <!-- Service type -->
              <h6 class="fs-title">Service Type</h6>
              <div class="type-tgl mb-3">
                <button [class.active]="form.bookingType==='in_person'" (click)="form.bookingType='in_person'">
                  <i class="bi bi-house-door me-1"></i>In-Person
                </button>
                <button [class.active]="form.bookingType==='remote'" (click)="form.bookingType='remote'">
                  <i class="bi bi-camera-video me-1"></i>Online
                </button>
              </div>

              <!-- Date + time -->
              <div class="row g-3 mb-3">
                <div class="col-6">
                  <label class="nb-label">Date</label>
                  <input type="date" class="nb-input" [(ngModel)]="form.scheduledDate" [min]="today" />
                </div>
                <div class="col-6">
                  <label class="nb-label">Time</label>
                  <select class="nb-input" [(ngModel)]="form.scheduledTime">
                    @for (t of slots; track t) { <option [value]="t">{{ t }}</option> }
                  </select>
                </div>
              </div>

              @if (form.bookingType==='in_person') {
                <div class="mb-3">
                  <label class="nb-label">Your Address</label>
                  <input type="text" class="nb-input" [(ngModel)]="form.address"
                         placeholder="Door no, street, area, city" />
                </div>
              } @else {
                <div class="remote-info mb-3">
                  <i class="bi bi-camera-video-fill"></i>
                  <div>
                    <p class="ri-t">Online Session</p>
                    <p class="ri-s">A Jitsi Meet link will be generated and shared in your booking details.</p>
                  </div>
                </div>
              }

              <div class="mb-3">
                <label class="nb-label">Notes for Provider (optional)</label>
                <textarea class="nb-input" rows="3" [(ngModel)]="form.notes"
                          placeholder="Describe your requirement..."></textarea>
              </div>

              @if (error()) {
                <div class="err-box">
                  <i class="bi bi-exclamation-circle me-2"></i>{{ error() }}
                </div>
              }

              <button class="btn-nb-primary btn w-100 py-2"
                      (click)="submit()" [disabled]="loading()"
                      data-testid="confirm-booking-btn">
                @if (loading()) { <span class="spinner-border spinner-border-sm me-2"></span> }
                <i class="bi bi-calendar-check me-2"></i>Confirm Booking Request
              </button>
            </div>
          </div>

          <!-- Summary sidebar -->
          <div class="col-md-5">
            <div class="sum-card">
              <h6 class="fs-title">Summary</h6>
              <div class="sum-rows">
                <div class="sr"><span>Type</span><strong>{{ form.bookingType==='in_person' ? 'In-Person' : 'Online' }}</strong></div>
                <div class="sr"><span>Date</span><strong>{{ form.scheduledDate || '—' }}</strong></div>
                <div class="sr"><span>Time</span><strong>{{ form.scheduledTime }}</strong></div>
              </div>
              <hr class="divider">
              <div class="guarantee">
                <i class="bi bi-shield-check-fill"></i>
                <p>NearBy guarantee: If a provider doesn't show, we help you rebook free.</p>
              </div>
            </div>
          </div>
        </div>
      }
    </div>
  `,
  styles: [`
    .form-card { background:#fff;border:1px solid var(--nb-border);border-radius:var(--radius-lg);padding:1.5rem; }
    .fs-title  { font-family:var(--font-display);font-size:.75rem;font-weight:700;text-transform:uppercase;letter-spacing:.06em;color:var(--nb-text-muted);margin-bottom:.75rem; }
    .prov-mini { display:flex;align-items:center;gap:12px;background:var(--nb-surface-2);border-radius:var(--radius-md);padding:12px; }
    .pm-av     { width:44px;height:44px;border-radius:12px;display:flex;align-items:center;justify-content:center;font-family:var(--font-display);font-size:1.25rem;font-weight:800;color:#fff; }
    .pm-name   { font-family:var(--font-display);font-weight:700;margin:0; }
    .pm-sub    { font-size:.78rem;color:var(--nb-text-muted);margin:0; }
    .type-tgl  { display:flex;gap:8px; }
    .type-tgl button { flex:1;padding:9px;border-radius:var(--radius-sm);border:1.5px solid var(--nb-border);background:var(--nb-bg);font-family:var(--font-display);font-size:.8rem;font-weight:600;cursor:pointer;transition:all .2s; }
    .type-tgl button.active { background:var(--nb-primary);border-color:var(--nb-primary);color:#fff; }
    .remote-info { display:flex;gap:12px;align-items:flex-start;background:#EFF6FF;border-radius:var(--radius-md);padding:12px; }
    .remote-info i { color:var(--nb-primary-light);font-size:1.25rem;margin-top:2px; }
    .ri-t { font-family:var(--font-display);font-weight:700;font-size:.875rem;margin:0; }
    .ri-s { font-size:.78rem;color:var(--nb-text-muted);margin:0; }
    textarea.nb-input { resize:vertical; }
    .err-box { background:#FEE2E2;color:#991b1b;border-radius:var(--radius-md);padding:10px 14px;font-size:.875rem;margin-bottom:12px; }
    .sum-card { background:#fff;border:1px solid var(--nb-border);border-radius:var(--radius-lg);padding:1.25rem;position:sticky;top:130px; }
    .sum-rows { display:flex;flex-direction:column;gap:10px; }
    .sr { display:flex;justify-content:space-between;font-size:.875rem; }
    .sr span { color:var(--nb-text-muted); }
    .guarantee { display:flex;gap:10px;align-items:flex-start;font-size:.78rem;color:var(--nb-text-muted); }
    .guarantee i { color:var(--nb-success);font-size:1rem;margin-top:2px; }
    .guarantee p { margin:0; }
    .success-card { text-align:center;padding:3rem 2rem;background:#fff;border:1px solid var(--nb-border);border-radius:var(--radius-xl); }
    .success-icon { font-size:3.5rem;color:var(--nb-success);margin-bottom:1rem; }
    .success-card h4 { font-size:1.4rem;font-weight:800;margin-bottom:.5rem; }
  `]
})
export class BookingFormComponent implements OnInit {
  form = { providerId:'', bookingType:'in_person', scheduledDate:'', scheduledTime:'10:00', address:'', notes:'' };
  providerName  = 'Service Provider';
  providerSub   = '';
  providerColor = '#2563A8';
  today  = new Date().toISOString().split('T')[0];
  slots  = ['09:00','10:00','11:00','12:00','14:00','15:00','16:00','17:00'];
  loading = signal(false);
  error   = signal('');
  success = signal(false);

  constructor(
    private route: ActivatedRoute, private router: Router,
    private api: ApiService, private auth: AuthService, private toast: ToastService
  ) {}

  ngOnInit() {
    this.form.scheduledDate = this.today;
    this.route.queryParams.subscribe(p => {
      if (p['providerId'])  this.form.providerId    = p['providerId'];
      if (p['date'])        this.form.scheduledDate = p['date'];
      if (p['time'])        this.form.scheduledTime = p['time'];
      if (p['type'])        this.form.bookingType   = p['type'];
      if (this.form.providerId) this.loadProvider();
    });
  }

  loadProvider() {
    this.api.get<ApiResponse<Provider>>(`/providers/${this.form.providerId}`).subscribe({
      next: res => {
        const p = res.data;
        this.providerName  = p.businessName;
        this.providerSub   = `${p.subCategory} · ${p.userId?.location?.city ?? 'Chennai'}`;
        const colors: Record<string,string> = { home_services:'#2563A8', education:'#059669', food:'#D97706', wellness:'#7C3AED', events:'#DC2626' };
        this.providerColor = colors[p.category] ?? '#2563A8';
      },
    });
  }

  submit() {
    this.error.set('');
    if (!this.form.scheduledDate) { this.error.set('Please select a date.'); return; }
    if (this.form.bookingType === 'in_person' && !this.form.address.trim()) {
      this.error.set('Please enter your address for in-person service.'); return;
    }
    this.loading.set(true);
    this.api.post<any>('/bookings', this.form).subscribe({
      next: () => { this.loading.set(false); this.success.set(true); },
      error: (err) => {
        this.loading.set(false);
        this.error.set(err.error?.message ?? 'Booking failed. Please try again.');
      },
    });
  }
}
