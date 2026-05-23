// src/app/features/booking/booking-detail.component.ts
import { Component, OnInit, signal } from '@angular/core';
import { CommonModule }   from '@angular/common';
import { RouterLink, ActivatedRoute } from '@angular/router';
import { ApiService, Booking, ApiResponse } from '../../core/services/api.service';
import { AuthService }    from '../../core/auth/auth.service';
import { ToastService }   from '../../core/services/toast.service';

@Component({
  selector: 'app-booking-detail',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <div class="container py-4" style="max-width:720px">
      <a routerLink="/dashboard/customer" class="back-link">
        <i class="bi bi-arrow-left me-2"></i>Back to Dashboard
      </a>

      @if (loading()) {
        <div class="nb-spinner-wrap"><div class="nb-spinner"></div></div>
      } @else if (!booking()) {
        <p class="text-muted-nb text-center py-5">Booking not found.</p>
      } @else {
        <div class="bk-detail-card mt-3">

          <!-- Header -->
          <div class="bkd-header">
            <div>
              <h4 class="bkd-title">Booking Details</h4>
              <p class="bkd-ref" style="font-size:.8rem;color:rgba(255,255,255,.7)">#{{ booking()!._id.slice(-8).toUpperCase() }}</p>
            </div>
            <span class="nb-badge" [class]="statusClass(booking()!.status)" style="font-size:.8rem;padding:6px 14px">
              {{ booking()!.status | titlecase }}
            </span>
          </div>

          <div class="bkd-body">

            <!-- Provider info -->
            <div class="info-row">
              <div class="ir-label">Provider</div>
              <div class="ir-val fw-display" style="font-weight:700">
                {{ booking()!.providerId?.businessName ?? 'Provider' }}
              </div>
            </div>
            <div class="info-row">
              <div class="ir-label">Service Type</div>
              <div class="ir-val">
                @if (booking()!.bookingType === 'remote') {
                  <span class="nb-badge nb-badge-primary"><i class="bi bi-camera-video-fill"></i>Online / Remote</span>
                } @else {
                  <span class="nb-badge nb-badge-muted"><i class="bi bi-house-door"></i>In-Person</span>
                }
              </div>
            </div>
            <div class="info-row">
              <div class="ir-label">Date & Time</div>
              <div class="ir-val">{{ booking()!.scheduledDate | date:'dd MMM yyyy' }} at {{ booking()!.scheduledTime }}</div>
            </div>
            @if (booking()!.address) {
              <div class="info-row">
                <div class="ir-label">Address</div>
                <div class="ir-val">{{ booking()!.address }}</div>
              </div>
            }
            @if (booking()!.meetingLink) {
              <div class="info-row">
                <div class="ir-label">Meeting Link</div>
                <div class="ir-val">
                  <a [href]="booking()!.meetingLink" target="_blank" class="join-link" data-testid="meeting-link">
                    <i class="bi bi-camera-video-fill me-1"></i>{{ booking()!.meetingLink }}
                  </a>
                </div>
              </div>
            }
            @if (booking()!.notes) {
              <div class="info-row">
                <div class="ir-label">Your Notes</div>
                <div class="ir-val" style="font-style:italic;color:var(--nb-text-muted)">"{{ booking()!.notes }}"</div>
              </div>
            }

            <!-- Actions -->
            <div class="bkd-actions">
              @if (['pending','accepted'].includes(booking()!.status) && isCustomer()) {
                <button class="btn btn-danger btn-sm" (click)="cancel()">
                  <i class="bi bi-x-circle me-1"></i>Cancel Booking
                </button>
              }
              @if (booking()!.status === 'completed' && isCustomer()) {
                <a routerLink="/browse" class="btn-nb-primary btn btn-sm">
                  <i class="bi bi-star me-1"></i>Leave a Review
                </a>
              }
              <a [routerLink]="['/chat', booking()!._id]" class="btn-nb-outline btn btn-sm">
                <i class="bi bi-chat-dots me-1"></i>Message Provider
              </a>
            </div>

          </div>
        </div>
      }
    </div>
  `,
  styles: [`
    .back-link { color:var(--nb-text-muted);font-size:.875rem;text-decoration:none;display:inline-flex;align-items:center; }
    .back-link:hover { color:var(--nb-primary); }
    .bk-detail-card { border:1px solid var(--nb-border);border-radius:var(--radius-xl);overflow:hidden;background:#fff; }
    .bkd-header { background:var(--nb-primary);padding:1.5rem 2rem;display:flex;justify-content:space-between;align-items:flex-start; }
    .bkd-title { font-size:1.2rem;font-weight:800;color:#fff;margin:0; }
    .bkd-body { padding:2rem; }
    .info-row { display:flex;align-items:flex-start;gap:16px;padding:12px 0;border-bottom:1px solid var(--nb-border); }
    .info-row:last-of-type { border-bottom:none; }
    .ir-label { font-family:var(--font-display);font-size:.75rem;font-weight:700;text-transform:uppercase;letter-spacing:.05em;color:var(--nb-text-muted);min-width:120px; }
    .ir-val   { font-size:.9rem;color:var(--nb-text); }
    .join-link { color:var(--nb-primary);font-size:.8rem;word-break:break-all; }
    .bkd-actions { display:flex;gap:10px;flex-wrap:wrap;margin-top:1.5rem;padding-top:1.5rem;border-top:1px solid var(--nb-border); }
  `]
})
export class BookingDetailComponent implements OnInit {
  booking = signal<Booking | null>(null);
  loading = signal(true);

  constructor(
    private route:  ActivatedRoute,
    private api:    ApiService,
    public  auth:   AuthService,
    private toast:  ToastService,
  ) {}

  ngOnInit() {
    const id = this.route.snapshot.paramMap.get('id') ?? '';
    this.api.get<ApiResponse<Booking>>(`/bookings/${id}`).subscribe({
      next: res => { this.booking.set(res.data); this.loading.set(false); },
      error: ()  => this.loading.set(false),
    });
  }

  isCustomer() { return this.auth.userRole() === 'customer'; }

  cancel() {
    if (!confirm('Cancel this booking?')) return;
    this.api.put<any>(`/bookings/${this.booking()?._id}/cancel`, { reason: 'Cancelled by customer' }).subscribe({
      next: (res) => { this.booking.set(res.data); this.toast.success('Booking cancelled.'); },
      error: () => this.toast.error('Could not cancel booking.'),
    });
  }

  statusClass(s: string) {
    if (['accepted','completed'].includes(s)) return 'nb-badge nb-badge-success';
    if (s === 'pending')     return 'nb-badge nb-badge-warning';
    if (['rejected','cancelled'].includes(s)) return 'nb-badge nb-badge-danger';
    if (s === 'in_progress') return 'nb-badge nb-badge-primary';
    return 'nb-badge nb-badge-muted';
  }
}
