// src/app/features/booking/booking-detail.component.ts
import { Component, OnInit, signal } from '@angular/core';
import { CommonModule }   from '@angular/common';
import { FormsModule }    from '@angular/forms';
import { RouterLink, ActivatedRoute, Router } from '@angular/router';
import { ApiService, Booking, ApiResponse } from '../../core/services/api.service';
import { ChatService }    from '../../core/services/chat.service';
import { AuthService }    from '../../core/auth/auth.service';
import { ToastService }   from '../../core/services/toast.service';

@Component({
  selector: 'app-booking-detail',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
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
              @if (['pending','accepted','in_progress'].includes(booking()!.status) && isCustomer()) {
                @if (['accepted','in_progress'].includes(booking()!.status)) {
                  <button class="btn-nb-primary btn btn-sm" (click)="markCompleted()" [disabled]="busy()"
                          data-testid="complete-btn">
                    <i class="bi bi-check2-all me-1"></i>Mark as Completed
                  </button>
                }
                <button class="btn btn-danger btn-sm" (click)="cancel()" [disabled]="busy()"
                        data-testid="cancel-btn">
                  <i class="bi bi-x-circle me-1"></i>Cancel Booking
                </button>
              }
              <button class="btn-nb-outline btn btn-sm" (click)="messageOther()">
                <i class="bi bi-chat-dots me-1"></i>{{ isCustomer() ? 'Message Provider' : 'Message Customer' }}
              </button>
            </div>

            <!-- Review section (after completion) -->
            @if (booking()!.status === 'completed' && isCustomer()) {
              <div class="review-box" data-testid="review-section">
                @if (alreadyReviewed()) {
                  <div class="py-2">
                    <h6 class="fw-display mb-2"><i class="bi bi-check-circle-fill me-2" style="color:var(--nb-success)"></i>Your review</h6>
                    @if (existingReview()) {
                      <div class="stars mb-2">
                        @for (s of [1,2,3,4,5]; track s) {
                          <i class="bi" [class.bi-star-fill]="s <= existingReview()!.rating" [class.bi-star]="s > existingReview()!.rating" style="color:var(--nb-accent)"></i>
                        }
                      </div>
                      @if (existingReview()!.review) {
                        <p class="mb-2" style="font-size:.875rem;font-style:italic;color:var(--nb-text-muted)">"{{ existingReview()!.review }}"</p>
                      }
                      @if (existingReview()!.images?.length) {
                        <div class="rev-imgs">
                          @for (img of existingReview()!.images; track $index) {
                            <img class="rev-thumb-static" [src]="img" alt="review photo" />
                          }
                        </div>
                      }
                    } @else {
                      <p class="mb-0" style="font-size:.9rem">Thanks for your review!</p>
                    }
                  </div>
                } @else {
                  <h6 class="fw-display mb-1">Rate your experience</h6>
                  <p class="text-muted-nb mb-3" style="font-size:.8rem">
                    How was the service from {{ booking()!.providerId?.businessName ?? 'your provider' }}?
                  </p>

                  <div class="stars mb-3">
                    @for (s of [1,2,3,4,5]; track s) {
                      <i class="bi star"
                         [class.bi-star-fill]="s <= rating()"
                         [class.bi-star]="s > rating()"
                         (click)="rating.set(s)"></i>
                    }
                  </div>

                  <div class="tags-wrap mb-3">
                    @for (t of tagOptions; track t) {
                      <button type="button" class="tag-chip" [class.on]="selectedTags().includes(t)"
                              (click)="toggleTag(t)">{{ t }}</button>
                    }
                  </div>

                  <textarea class="nb-input mb-3" rows="3" [(ngModel)]="comment"
                            placeholder="Share a comment about your experience (optional)..."></textarea>

                  <div class="mb-3">
                    <button type="button" class="btn-nb-outline btn btn-sm" (click)="ri.click()">
                      <i class="bi bi-camera me-1"></i>Add Photos
                    </button>
                    <input #ri type="file" hidden accept="image/*" multiple (change)="onReviewPhotos($event)" />
                    @if (reviewImages().length) {
                      <div class="rev-imgs mt-2">
                        @for (img of reviewImages(); track $index) {
                          <div class="rev-thumb">
                            <img [src]="img" alt="review photo" />
                            <button type="button" class="rev-del" (click)="removeReviewPhoto($index)"><i class="bi bi-x"></i></button>
                          </div>
                        }
                      </div>
                    }
                  </div>

                  @if (reviewError()) {
                    <div class="err-box mb-2"><i class="bi bi-exclamation-circle me-2"></i>{{ reviewError() }}</div>
                  }

                  <button class="btn-nb-primary btn w-100" (click)="submitReview()" [disabled]="submitting()"
                          data-testid="submit-review-btn">
                    @if (submitting()) { <span class="spinner-border spinner-border-sm me-2"></span> }
                    <i class="bi bi-send me-1"></i>Submit Review
                  </button>
                }
              </div>
            }

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
    .review-box { margin-top:1.5rem;padding-top:1.5rem;border-top:1px solid var(--nb-border); }
    .stars { display:flex;gap:8px;font-size:1.8rem; }
    .star  { color:var(--nb-accent);cursor:pointer;transition:transform .1s; }
    .star:hover { transform:scale(1.15); }
    .tags-wrap { display:flex;flex-wrap:wrap;gap:8px; }
    .tag-chip  { padding:5px 12px;border-radius:20px;border:1.5px solid var(--nb-border);background:var(--nb-bg);font-size:.78rem;font-family:var(--font-display);font-weight:600;cursor:pointer;transition:all .15s; }
    .tag-chip.on { background:var(--nb-primary);border-color:var(--nb-primary);color:#fff; }
    .err-box { background:#FEE2E2;color:#991b1b;border-radius:var(--radius-md);padding:10px 14px;font-size:.875rem; }
    .rev-imgs { display:flex;flex-wrap:wrap;gap:8px; }
    .rev-thumb { position:relative;width:72px;height:72px;border-radius:var(--radius-md);overflow:hidden;border:1px solid var(--nb-border); }
    .rev-thumb img { width:100%;height:100%;object-fit:cover; }
    .rev-thumb-static { width:72px;height:72px;object-fit:cover;border-radius:var(--radius-md);border:1px solid var(--nb-border); }
    .rev-del { position:absolute;top:2px;right:2px;width:20px;height:20px;border:none;border-radius:50%;background:rgba(0,0,0,.6);color:#fff;font-size:.7rem;display:flex;align-items:center;justify-content:center;cursor:pointer; }
  `]
})
export class BookingDetailComponent implements OnInit {
  booking = signal<Booking | null>(null);
  loading = signal(true);
  busy    = signal(false);            // cancel / complete in flight

  // Review state
  rating          = signal(0);
  selectedTags    = signal<string[]>([]);
  comment         = '';
  submitting      = signal(false);
  reviewError     = signal('');
  reviewImages    = signal<string[]>([]);
  alreadyReviewed = signal(false);
  existingReview  = signal<{ rating: number; review: string; images: string[] } | null>(null);
  tagOptions = ['Punctual','Professional','Good Value','Friendly','Clean Work'];

  private bookingId = '';

  constructor(
    private route:  ActivatedRoute,
    private api:    ApiService,
    private chat:   ChatService,
    public  auth:   AuthService,
    private toast:  ToastService,
    private router: Router,
  ) {}

  // Open the unique conversation with the other party in this booking
  messageOther() {
    const b = this.booking();
    if (!b) return;
    const payload = this.isCustomer()
      ? { providerId: b.providerId?._id }
      : { customerId: b.customerId?._id };
    this.chat.open(payload).subscribe({
      next: c => this.router.navigate(['/chat', c._id]),
      error: () => this.toast.error('Could not open chat.'),
    });
  }

  ngOnInit() {
    this.bookingId = this.route.snapshot.paramMap.get('id') ?? '';
    this.load();
  }

  load() {
    this.api.get<ApiResponse<Booking>>(`/bookings/${this.bookingId}`).subscribe({
      next: res => {
        this.booking.set(res.data);
        this.loading.set(false);
        if (res.data.status === 'completed' && this.isCustomer()) this.checkExistingReview();
      },
      error: () => this.loading.set(false),
    });
  }

  isCustomer() { return this.auth.userRole() === 'customer'; }

  // Detect whether this booking already has a review
  checkExistingReview() {
    const providerId = this.booking()?.providerId?._id;
    if (!providerId) return;
    this.api.get<ApiResponse<any[]>>(`/reviews/provider/${providerId}`).subscribe({
      next: res => {
        const mine = (res.data ?? []).find(r => String(r.bookingId) === this.bookingId);
        this.alreadyReviewed.set(!!mine);
        this.existingReview.set(mine ? { rating: mine.rating, review: mine.review, images: mine.images ?? [] } : null);
      },
    });
  }

  cancel() {
    if (!confirm('Cancel this booking? The provider will be notified.')) return;
    this.busy.set(true);
    this.api.put<any>(`/bookings/${this.bookingId}/cancel`, { reason: 'Cancelled by customer' }).subscribe({
      next: (res) => { this.booking.set(res.data); this.busy.set(false); this.toast.success('Booking cancelled. Provider notified.'); },
      error: () => { this.busy.set(false); this.toast.error('Could not cancel booking.'); },
    });
  }

  markCompleted() {
    if (!confirm('Mark this service as completed?')) return;
    this.busy.set(true);
    this.api.put<any>(`/bookings/${this.bookingId}/complete`, {}).subscribe({
      next: (res) => {
        this.booking.set(res.data);
        this.busy.set(false);
        this.toast.success('Service marked as completed. You can rate it now.');
      },
      error: () => { this.busy.set(false); this.toast.error('Could not update booking.'); },
    });
  }

  toggleTag(t: string) {
    const tags = this.selectedTags();
    this.selectedTags.set(tags.includes(t) ? tags.filter(x => x !== t) : [...tags, t]);
  }

  onReviewPhotos(e: Event) {
    const el = e.target as HTMLInputElement;
    if (!el.files) return;
    Array.from(el.files).forEach(f => {
      if (f.size > 5 * 1024 * 1024) { this.toast.error(`${f.name} is over 5 MB.`); return; }
      if (!f.type.startsWith('image/')) return;
      const reader = new FileReader();
      reader.onload = () => this.reviewImages.update(list => [...list, reader.result as string]);
      reader.readAsDataURL(f);
    });
    el.value = '';
  }

  removeReviewPhoto(i: number) {
    this.reviewImages.update(list => list.filter((_, idx) => idx !== i));
  }

  submitReview() {
    this.reviewError.set('');
    if (this.rating() < 1) { this.reviewError.set('Please select a star rating.'); return; }

    this.submitting.set(true);
    this.api.post<any>('/reviews', {
      bookingId: this.bookingId,
      rating:    this.rating(),
      review:    this.comment.trim(),
      tags:      this.selectedTags(),
      images:    this.reviewImages(),
    }).subscribe({
      next: () => {
        this.submitting.set(false);
        this.alreadyReviewed.set(true);
        this.toast.success('Thanks! Your review has been submitted.');
      },
      error: (err) => {
        this.submitting.set(false);
        const msg = err.error?.message ?? 'Could not submit review.';
        if (err.status === 409) { this.alreadyReviewed.set(true); }
        else this.reviewError.set(msg);
      },
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
