// src/app/features/dashboard/provider-dashboard.component.ts
import { Component, OnInit, OnDestroy, signal, computed } from '@angular/core';
import { CommonModule }  from '@angular/common';
import { FormsModule }   from '@angular/forms';
import { RouterLink, Router } from '@angular/router';
import { Subscription }  from 'rxjs';
import { AuthService }   from '../../core/auth/auth.service';
import { ApiService, ApiResponse, SocketService } from '../../core/services/api.service';
import { ChatService }   from '../../core/services/chat.service';
import { ToastService }  from '../../core/services/toast.service';
import { AdMobService }  from '../../core/services/admob.service';
import { SettingsService } from '../../core/services/settings.service';

interface Stats {
  views:    { today: number; week: number; all: number };
  contacts: { week: number; all: number };
  rating:   { avg: number; count: number };
  completion: number;
}
interface Teaser { count: number; unlocked: boolean; adsWatched: number; adsRequired: number; }
interface MyReview { _id: string; rating: number; review: string; providerReply: string; createdAt: string; customerId: any; }
interface Visitor { name: string; phone: string; visitedAt: string; }
interface Lead { _id: string; name: string; mobile: string; service: string; location: string; createdAt: string; }

@Component({
  selector: 'app-provider-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  template: `
    <div class="container py-4">

      <div class="d-flex justify-content-between align-items-center mb-4 flex-wrap gap-2">
        <div>
          <h2 class="section-title">Provider Dashboard</h2>
          <p class="section-sub mb-0">Welcome back, {{ auth.currentUser()?.name }}</p>
        </div>
        <div class="d-flex gap-2">
          <a routerLink="/provider/services" class="btn-nb-primary btn btn-sm">
            <i class="bi bi-pencil-square me-1"></i>Edit Profile
          </a>
        </div>
      </div>

      <!-- ── STAT CARDS (4.6) ─────────────────────────────────── -->
      <div class="stat-grid mb-4">
        <div class="stat-card sc-blue">
          <div class="sc-top"><span class="sc-icon"><i class="bi bi-eye-fill"></i></span>
            <span class="sc-trend">Today {{ stats()?.views?.today ?? 0 }}</span></div>
          <p class="sc-num">{{ animViews() }}</p>
          <p class="sc-lbl">Profile Views</p>
          <p class="sc-foot">{{ stats()?.views?.week ?? 0 }} this week</p>
        </div>
        <div class="stat-card sc-green">
          <div class="sc-top"><span class="sc-icon"><i class="bi bi-telephone-fill"></i></span>
            <span class="sc-trend">+{{ stats()?.contacts?.week ?? 0 }}/wk</span></div>
          <p class="sc-num">{{ animContacts() }}</p>
          <p class="sc-lbl">Total Contacts</p>
          <p class="sc-foot">calls + WhatsApp</p>
        </div>
        <div class="stat-card sc-amber">
          <div class="sc-top"><span class="sc-icon"><i class="bi bi-star-fill"></i></span></div>
          <p class="sc-num">{{ stats()?.rating?.avg ?? 0 }}<span class="sc-star">★</span></p>
          <p class="sc-lbl">Rating</p>
          <p class="sc-foot">{{ stats()?.rating?.count ?? 0 }} reviews</p>
        </div>
        <div class="stat-card sc-purple">
          <div class="sc-top"><span class="sc-icon"><i class="bi bi-clipboard-check-fill"></i></span></div>
          <p class="sc-num">{{ stats()?.completion ?? 0 }}%</p>
          <p class="sc-lbl">Profile Complete</p>
          <div class="prog-track mt-1"><div class="prog-fill" [style.width.%]="stats()?.completion ?? 0"></div></div>
          @if ((stats()?.completion ?? 0) < 100) {
            <p class="sc-foot"><a routerLink="/provider/services">Complete it →</a></p>
          }
        </div>
      </div>

      <div class="row g-4">
        <div class="col-lg-7">

          <!-- ── WHO VISITED (4.8) — hidden when admin disables the feature ── -->
          @if (settings.settings()?.whoVisitedEnabled !== false) {
          <div class="ds-card mb-4 wv-card">
            <div class="ds-hdr">
              <h6 class="ds-title"><i class="bi bi-incognito me-2"></i>Who Visited My Profile?</h6>
            </div>
            @if (teaser(); as t) {
              @if (visitorsRevealed()) {
                <p class="wv-teaser unlocked"><i class="bi bi-unlock-fill"></i>
                  Unlocked — {{ visitors().length }} recent visitors</p>
                <div class="visitor-list">
                  @for (v of visitors(); track $index) {
                    <div class="visitor-row">
                      <div class="v-av">{{ v.name.charAt(0) }}</div>
                      <div class="flex-grow-1">
                        <p class="v-name">{{ v.name }}</p>
                        <p class="v-meta">{{ v.phone }} · {{ v.visitedAt | date:'dd MMM, h:mm a' }}</p>
                      </div>
                    </div>
                  } @empty {
                    <p class="text-muted-nb text-center py-2" style="font-size:.85rem">No visitors yet this week.</p>
                  }
                </div>
              } @else {
                <div class="wv-locked">
                  <p class="wv-big">{{ t.count }}</p>
                  <p class="wv-cap">people visited your profile this week</p>
                  <p class="wv-hint">Watch {{ t.adsRequired }} short ads to reveal who they are.</p>
                  <div class="wv-progress">
                    @for (i of [].constructor(t.adsRequired); track $index) {
                      <span class="wv-dot" [class.done]="$index < t.adsWatched"></span>
                    }
                  </div>
                  <button class="btn-nb-accent btn w-100" [disabled]="watchingAd()" (click)="watchAd()">
                    @if (watchingAd()) { <span class="spinner-border spinner-border-sm me-2"></span>Loading ad… }
                    @else { <i class="bi bi-play-circle me-2"></i>Watch ad ({{ t.adsWatched }}/{{ t.adsRequired }}) }
                  </button>
                </div>
              }
            } @else {
              <div class="text-center py-3"><div class="nb-spinner" style="margin:auto"></div></div>
            }
          </div>
          }

          <!-- ── REVIEWS + REPLY (4.7) ──────────────────────────── -->
          <div class="ds-card">
            <div class="ds-hdr"><h6 class="ds-title">Reviews &amp; Replies</h6>
              <span class="nb-badge nb-badge-muted">{{ myReviews().length }}</span></div>
            @if (myReviews().length === 0) {
              <p class="text-muted-nb text-center py-3" style="font-size:.875rem">No reviews yet.</p>
            }
            @for (r of myReviews(); track r._id) {
              <div class="rev-row">
                <div class="d-flex justify-content-between align-items-start">
                  <div>
                    <p class="rev-name">{{ r.customerId?.name || 'Customer' }}</p>
                    <p class="rev-stars">{{ starStr(r.rating) }}
                      <span class="rev-date">{{ r.createdAt | date:'dd MMM yyyy' }}</span></p>
                  </div>
                </div>
                @if (r.review) { <p class="rev-text">"{{ r.review }}"</p> }

                @if (r.providerReply && replyingTo() !== r._id) {
                  <div class="rev-reply"><i class="bi bi-reply-fill me-1"></i>{{ r.providerReply }}
                    <button class="rev-editlink" (click)="startReply(r)">Edit</button></div>
                } @else if (replyingTo() === r._id) {
                  <div class="reply-box">
                    <textarea class="nb-input" rows="2" [(ngModel)]="replyText"
                              placeholder="Write a public reply…"></textarea>
                    <div class="d-flex gap-2 mt-2">
                      <button class="btn-nb-primary btn btn-sm" (click)="sendReply(r)">Post Reply</button>
                      <button class="btn-nb-outline btn btn-sm" (click)="replyingTo.set(null)">Cancel</button>
                    </div>
                  </div>
                } @else {
                  <button class="rev-replybtn" (click)="startReply(r)">
                    <i class="bi bi-reply me-1"></i>Reply
                  </button>
                }
              </div>
            }
          </div>
        </div>

        <!-- Right column: leads + quick links -->
        <div class="col-lg-5">

          <!-- ── RECENT LEADS (11.17) ───────────────────────────── -->
          <div class="ds-card mb-4">
            <div class="ds-hdr"><h6 class="ds-title"><i class="bi bi-megaphone-fill me-2"></i>Recent Leads</h6>
              <span class="nb-badge nb-badge-muted">{{ leads().length }}</span></div>

            <!-- Provider opt-in/out for new-lead alerts (default on) -->
            <label class="lead-pref">
              <span class="lead-pref-txt"><i class="bi bi-bell me-1"></i>Notify me about new leads</span>
              <span class="nb-switch">
                <input type="checkbox" [checked]="leadNotifications()"
                       [disabled]="savingPref()" (change)="toggleLeadNotifications($event)">
                <span class="nb-slider"></span>
              </span>
            </label>

            @if (leads().length === 0) {
              <p class="text-muted-nb text-center py-3" style="font-size:.875rem">
                No enquiries yet. Leads from customers in your category &amp; area appear here.</p>
            }
            @for (l of leads(); track l._id) {
              <div class="lead-row">
                <div class="flex-grow-1">
                  <p class="lead-name">{{ l.name }}
                    <span class="lead-time">{{ l.createdAt | date:'dd MMM, h:mm a' }}</span></p>
                  <p class="lead-meta">
                    @if (l.service) { <span><i class="bi bi-tag me-1"></i>{{ l.service }}</span> }
                    @if (l.location) { <span class="ms-2"><i class="bi bi-geo-alt me-1"></i>{{ l.location }}</span> }
                  </p>
                </div>
                @if (leadsRevealed()) {
                  <a class="lead-call" [href]="'tel:' + l.mobile"><i class="bi bi-telephone-fill me-1"></i>{{ l.mobile }}</a>
                } @else {
                  <span class="lead-call lead-locked"><i class="bi bi-lock-fill me-1"></i>{{ maskMobile(l.mobile) }}</span>
                }
              </div>
            }

            @if (leads().length > 0 && !leadsRevealed()) {
              <button class="btn-nb-accent btn w-100 mt-2" [disabled]="revealingLeads()" (click)="revealLeads()">
                @if (revealingLeads()) { <span class="spinner-border spinner-border-sm me-2"></span>Loading ad… }
                @else { <i class="bi bi-play-circle me-2"></i>Watch 1 ad to reveal contact numbers }
              </button>
            }
          </div>

          <div class="ds-card">
            <div class="ds-hdr"><h6 class="ds-title">Quick Links</h6></div>
            <div class="ql-list">
              <a routerLink="/provider/services" class="ql-item"><i class="bi bi-pencil-square"></i>Edit Service Details</a>
              <a routerLink="/chats" class="ql-item"><i class="bi bi-chat-dots-fill"></i>My Conversations</a>
              <button type="button" class="ql-item" (click)="contactAdmin()"><i class="bi bi-headset"></i>Contact Admin / Support</button>
              <a routerLink="/complaints/new" class="ql-item"><i class="bi bi-flag"></i>Raise a Complaint</a>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .stat-grid { display:grid; grid-template-columns:repeat(auto-fit,minmax(200px,1fr)); gap:16px; }
    .stat-card { border-radius:var(--radius-lg); padding:1.25rem; color:#fff; position:relative; overflow:hidden; animation:scIn .45s cubic-bezier(.4,0,.2,1) both; }
    @keyframes scIn { from { opacity:0; transform:translateY(14px); } to { opacity:1; transform:translateY(0); } }
    .sc-blue   { background:linear-gradient(135deg,#1e4d8c,#2563A8); }
    .sc-green  { background:linear-gradient(135deg,#065f46,#059669); }
    .sc-amber  { background:linear-gradient(135deg,#b45309,#D97706); }
    .sc-purple { background:linear-gradient(135deg,#5b21b6,#7C3AED); }
    .sc-top { display:flex; justify-content:space-between; align-items:center; margin-bottom:.5rem; }
    .sc-icon { width:38px; height:38px; border-radius:11px; background:rgba(255,255,255,.18); display:flex; align-items:center; justify-content:center; font-size:1.1rem; }
    .sc-trend { font-size:.72rem; font-weight:600; background:rgba(255,255,255,.18); padding:2px 8px; border-radius:10px; }
    .sc-num { font-family:var(--font-display); font-size:2rem; font-weight:800; margin:0; line-height:1; }
    .sc-star { font-size:1.1rem; margin-left:2px; }
    .sc-lbl { font-size:.8rem; font-weight:600; margin:4px 0 0; opacity:.9; }
    .sc-foot { font-size:.7rem; margin:6px 0 0; opacity:.75; }
    .sc-foot a { color:#fff; text-decoration:underline; }
    .ds-card  { background:#fff; border:1px solid var(--nb-border); border-radius:var(--radius-lg); padding:1.25rem; }
    .ds-hdr   { display:flex; justify-content:space-between; align-items:center; margin-bottom:1rem; }
    .ds-title { font-family:var(--font-display); font-weight:700; margin:0; font-size:.95rem; }
    .prog-track { height:6px; background:rgba(255,255,255,.25); border-radius:4px; overflow:hidden; }
    .prog-fill  { height:100%; background:#fff; border-radius:4px; transition:width .6s ease; }
    /* Who Visited */
    .wv-card { background:linear-gradient(135deg,#fff,#faf8ff); }
    .wv-locked { text-align:center; }
    .wv-big { font-family:var(--font-display); font-size:2.6rem; font-weight:800; color:var(--nb-primary); margin:0; line-height:1; }
    .wv-cap { font-size:.85rem; color:var(--nb-text-muted); margin:2px 0 0; }
    .wv-hint { font-size:.8rem; color:var(--nb-text-muted); margin:.75rem 0; }
    .wv-progress { display:flex; gap:8px; justify-content:center; margin-bottom:1rem; }
    .wv-dot { width:36px; height:6px; border-radius:3px; background:var(--nb-border); transition:background .2s; }
    .wv-dot.done { background:var(--nb-success); }
    .wv-teaser.unlocked { color:var(--nb-success); font-weight:600; font-size:.875rem; display:flex; align-items:center; gap:6px; margin-bottom:.75rem; }
    .visitor-list { display:flex; flex-direction:column; gap:8px; max-height:300px; overflow-y:auto; }
    .visitor-row { display:flex; align-items:center; gap:10px; padding:8px 0; border-bottom:1px solid var(--nb-border); }
    .visitor-row:last-child { border-bottom:none; }
    .v-av { width:34px; height:34px; border-radius:50%; background:var(--nb-primary); color:#fff; display:flex; align-items:center; justify-content:center; font-weight:700; font-family:var(--font-display); }
    .v-name { font-weight:600; font-size:.875rem; margin:0; }
    .v-meta { font-size:.72rem; color:var(--nb-text-muted); margin:0; }
    /* Reviews */
    .rev-row { padding:12px 0; border-bottom:1px solid var(--nb-border); }
    .rev-row:last-child { border-bottom:none; }
    .rev-name { font-weight:700; font-size:.875rem; margin:0; font-family:var(--font-display); }
    .rev-stars { color:var(--nb-accent); font-size:.85rem; margin:2px 0; }
    .rev-date { color:var(--nb-text-muted); font-size:.72rem; margin-left:6px; }
    .rev-text { font-size:.85rem; color:var(--nb-text-muted); font-style:italic; margin:4px 0; }
    .rev-reply { background:var(--nb-surface-2); border-radius:var(--radius-sm); padding:8px 12px; font-size:.82rem; margin-top:6px; }
    .rev-editlink, .rev-replybtn { background:none; border:none; color:var(--nb-primary); font-weight:600; font-size:.78rem; cursor:pointer; padding:0; }
    .rev-editlink { margin-left:8px; }
    .rev-replybtn { margin-top:6px; }
    .reply-box { margin-top:8px; }
    /* Leads */
    .lead-row { display:flex; align-items:center; gap:10px; padding:10px 0; border-bottom:1px solid var(--nb-border); }
    .lead-row:last-child { border-bottom:none; }
    .lead-name { font-weight:700; font-size:.875rem; margin:0; font-family:var(--font-display); }
    .lead-time { color:var(--nb-text-muted); font-size:.7rem; font-weight:400; margin-left:6px; }
    .lead-meta { font-size:.75rem; color:var(--nb-text-muted); margin:2px 0 0; }
    .lead-call { display:inline-flex; align-items:center; white-space:nowrap; font-size:.78rem; font-weight:600; color:var(--nb-success); text-decoration:none; background:var(--nb-surface-2); padding:6px 10px; border-radius:var(--radius-sm); }
    .lead-call:hover { background:#ECFDF5; }
    .lead-locked { color:var(--nb-text-muted); background:var(--nb-surface-2); cursor:default; }
    /* Lead notification preference + switch */
    .lead-pref { display:flex; align-items:center; justify-content:space-between; gap:10px; padding:8px 12px; margin-bottom:.75rem; background:var(--nb-surface-2); border-radius:var(--radius-md); }
    .lead-pref-txt { font-size:.82rem; font-weight:600; color:var(--nb-text); }
    .nb-switch { position:relative; display:inline-block; width:40px; height:22px; flex:none; }
    .nb-switch input { opacity:0; width:0; height:0; }
    .nb-slider { position:absolute; inset:0; cursor:pointer; background:var(--nb-border); border-radius:22px; transition:background .2s; }
    .nb-slider::before { content:''; position:absolute; height:16px; width:16px; left:3px; top:3px; background:#fff; border-radius:50%; transition:transform .2s; }
    .nb-switch input:checked + .nb-slider { background:var(--nb-success); }
    .nb-switch input:checked + .nb-slider::before { transform:translateX(18px); }
    .nb-switch input:disabled + .nb-slider { opacity:.6; cursor:default; }
    .ql-list { display:flex; flex-direction:column; gap:6px; }
    .ql-item { display:flex; align-items:center; gap:10px; padding:10px 12px; background:var(--nb-surface-2); border-radius:var(--radius-md); color:var(--nb-text); text-decoration:none; font-size:.875rem; transition:background .15s; }
    .ql-item i { color:var(--nb-primary); }
    .ql-item:hover { background:#EFF6FF; }
    button.ql-item { width:100%; border:none; text-align:left; cursor:pointer; font-family:inherit; }
  `]
})
export class ProviderDashboardComponent implements OnInit, OnDestroy {
  stats   = signal<Stats | null>(null);
  teaser  = signal<Teaser | null>(null);
  visitors = signal<Visitor[]>([]);
  leads    = signal<Lead[]>([]);
  myReviews = signal<MyReview[]>([]);
  watchingAd = signal(false);
  replyingTo = signal<string | null>(null);
  replyText = '';
  private myProviderId = '';

  // Session-only reveal state — both reset to locked whenever the dashboard is
  // re-entered (component re-created on navigation), so an ad must be watched
  // again each visit.
  visitorsRevealed = signal(false);
  leadsRevealed    = signal(false);
  revealingLeads   = signal(false);

  // Provider's lead-alert preference (default on); persisted server-side.
  leadNotifications = signal(true);
  savingPref        = signal(false);

  // count-up animated numbers
  animViews    = signal(0);
  animContacts = signal(0);

  private leadSub?: Subscription;

  constructor(
    public auth: AuthService,
    private api: ApiService,
    private chat: ChatService,
    private toast: ToastService,
    private router: Router,
    private admob: AdMobService,
    private socket: SocketService,
    public settings: SettingsService,
  ) {}

  ngOnInit() {
    this.loadStats();
    this.loadTeaser();
    this.loadProfileAndReviews();
    this.loadLeads();

    // Live: a new enquiry pushes a 'lead' notification — refresh the list so it
    // appears instantly without a page reload. (Opted-out providers don't get
    // the push, so this naturally respects the notify toggle.)
    this.leadSub = this.socket.onNotifyNew().subscribe((p: any) => {
      if (p?.type === 'lead') this.loadLeads();
    });
  }

  ngOnDestroy() {
    this.leadSub?.unsubscribe();
  }

  // Open (or resume) a support chat with the platform admin.
  contactAdmin() {
    this.chat.openSupport().subscribe({
      next: c => this.router.navigate(['/chat', c._id]),
      error: () => this.toast.error('Could not reach support right now.'),
    });
  }

  loadLeads() {
    this.api.get<ApiResponse<Lead[]>>('/leads').subscribe({
      next: res => this.leads.set(res.data ?? []),
    });
  }

  loadStats() {
    this.api.get<ApiResponse<Stats>>('/providers/my/stats').subscribe({
      next: res => {
        this.stats.set(res.data);
        this.countUp(this.animViews, res.data.views.all);
        this.countUp(this.animContacts, res.data.contacts.all);
      },
    });
  }

  loadTeaser() {
    // Skip entirely when the admin has switched off the "Who Visited" feature —
    // the card is hidden and the endpoint would just 403.
    if (this.settings.settings()?.whoVisitedEnabled === false) return;
    // Only fetch the count + ad progress here. The list stays locked until the
    // provider watches an ad this session (visitorsRevealed), so it re-locks on
    // every page visit even if the server already unlocked it this week.
    this.api.get<ApiResponse<Teaser>>('/providers/my/visitors/teaser').subscribe({
      next: res => this.teaser.set(res.data),
    });
  }

  loadVisitors() {
    this.api.get<ApiResponse<Visitor[]>>('/providers/my/visitors').subscribe({
      next: res => this.visitors.set(res.data ?? []),
    });
  }

  loadProfileAndReviews() {
    this.api.get<ApiResponse<any>>('/providers/my').subscribe({
      next: res => {
        this.myProviderId = res.data?._id ?? '';
        this.leadNotifications.set(res.data?.leadNotifications !== false);
        if (this.myProviderId) {
          this.api.get<ApiResponse<MyReview[]>>(`/reviews/provider/${this.myProviderId}`).subscribe({
            next: r => this.myReviews.set(r.data ?? []),
          });
        }
      },
    });
  }

  // Shows a real AdMob rewarded ad on native; on web (no ad layer) it
  // falls back to a short simulated watch so the flow is testable. Either
  // way, the server verifies + unlocks the batch on completion (6.3, 6.5).
  async watchAd() {
    this.watchingAd.set(true);

    const earned = await this.admob.showRewarded();   // true only on native completion
    if (!earned) {
      const hasNativeAds = await this.admob.isAdLayerAvailable();
      if (hasNativeAds) {
        // Native ad layer exists but the user didn't finish the ad — no reward.
        this.watchingAd.set(false);
        this.toast.error('Finish the ad to earn the reward.');
        return;
      }
      // Web fallback: simulate the watch so the feature works without a device.
      await new Promise(r => setTimeout(r, 1200));
    }

    this.api.post<ApiResponse<any>>('/ads/verify-reward', {}).subscribe({
      next: res => {
        this.watchingAd.set(false);
        if (res.data.unlocked) {
          this.visitorsRevealed.set(true);   // session-only reveal — re-locks on next visit
          this.loadVisitors();
          this.toast.success('Visitor list unlocked!');
        } else {
          this.toast.success(`Ad complete (${res.data.adsWatched}/${res.data.adsRequired})`);
        }
        this.loadTeaser();
      },
      error: () => { this.watchingAd.set(false); this.toast.error('Could not record ad. Try again.'); },
    });
  }

  // Leads: watching one ad reveals every lead's contact number for this page
  // visit only (leadsRevealed resets when the dashboard is re-entered).
  async revealLeads() {
    this.revealingLeads.set(true);

    const earned = await this.admob.showRewarded();
    if (!earned) {
      const hasNativeAds = await this.admob.isAdLayerAvailable();
      if (hasNativeAds) {
        this.revealingLeads.set(false);
        this.toast.error('Finish the ad to reveal the numbers.');
        return;
      }
      await new Promise(r => setTimeout(r, 1200));   // web fallback — simulate the watch
    }

    this.revealingLeads.set(false);
    this.leadsRevealed.set(true);
    this.toast.success('Lead contact numbers revealed.');
  }

  toggleLeadNotifications(ev: Event) {
    const on = (ev.target as HTMLInputElement).checked;
    this.savingPref.set(true);
    this.api.put<ApiResponse<{ leadNotifications: boolean }>>('/providers/my/preferences', { leadNotifications: on }).subscribe({
      next: res => {
        this.savingPref.set(false);
        this.leadNotifications.set(res.data.leadNotifications);
        this.toast.success(on ? 'Lead alerts turned on.' : 'Lead alerts turned off.');
      },
      error: () => {
        this.savingPref.set(false);
        this.leadNotifications.set(!on);   // revert the toggle on failure
        this.toast.error('Could not update preference.');
      },
    });
  }

  // Mask all but the last 4 digits, e.g. +91 ••••• 3843
  maskMobile(m: string) {
    const last4 = String(m || '').replace(/\D/g, '').slice(-4);
    return `+91 ••••• ${last4}`;
  }

  startReply(r: MyReview) { this.replyingTo.set(r._id); this.replyText = r.providerReply || ''; }

  sendReply(r: MyReview) {
    const reply = this.replyText.trim();
    if (!reply) return;
    this.api.post<ApiResponse<any>>(`/reviews/${r._id}/reply`, { reply }).subscribe({
      next: () => {
        this.myReviews.update(list => list.map(x => x._id === r._id ? { ...x, providerReply: reply } : x));
        this.replyingTo.set(null);
        this.toast.success('Reply posted.');
      },
      error: () => this.toast.error('Could not post reply.'),
    });
  }

  private countUp(sig: ReturnType<typeof signal<number>>, target: number) {
    if (target <= 0) { sig.set(0); return; }
    const steps = 20; const inc = target / steps; let cur = 0; let n = 0;
    const id = setInterval(() => {
      n++; cur += inc;
      sig.set(n >= steps ? target : Math.round(cur));
      if (n >= steps) clearInterval(id);
    }, 25);
  }

  starStr(r: number) { return '★'.repeat(Math.round(r)) + '☆'.repeat(5 - Math.round(r)); }
}
