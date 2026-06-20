// src/app/features/admin/admin-dashboard.component.ts
import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule }  from '@angular/common';
import { FormsModule }   from '@angular/forms';
import { RouterLink, Router, ActivatedRoute } from '@angular/router';
import { ApiService, ApiResponse } from '../../core/services/api.service';
import { ToastService }  from '../../core/services/toast.service';
import { ChatService }   from '../../core/services/chat.service';
import { DialogService } from '../../core/services/dialog.service';

interface Settings {
  otpEnabled: boolean;
  adsEnabled: boolean; rewardedAdsEnabled: boolean; whoVisitedEnabled: boolean;
  adsRequiredCount: number; registrationsEnabled: boolean; complaintsEnabled: boolean;
  featuredCategories: string[]; bannerAdUnitId: string; rewardedAdUnitId: string;
  announcement: { active: boolean; text: string };
}

@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  template: `
    <div class="container-fluid py-4 px-4">

      <div class="d-flex justify-content-between align-items-center mb-4 flex-wrap gap-2">
        <div>
          <h2 class="section-title">Admin Panel</h2>
          <p class="section-sub mb-0">NearBy Platform Control Centre</p>
        </div>
        <span class="nb-badge nb-badge-danger" style="font-size:.8rem;padding:6px 14px">
          <i class="bi bi-shield-fill me-1"></i>Admin Access
        </span>
      </div>

      <!-- KPI cards -->
      <div class="kpi-grid mb-4">
        @for (k of kpis(); track k.label) {
          <div class="kpi-card" [attr.data-testid]="'kpi-'+k.tid">
            <div class="kpi-icon" [style.background]="k.bg"><i class="bi" [class]="k.icon" [style.color]="k.ic"></i></div>
            <div><p class="kpi-num">{{ k.val }}</p><p class="kpi-lbl">{{ k.label }}</p></div>
          </div>
        }
      </div>

      <!-- Tabs -->
      <div class="atabs mb-3">
        @for (t of tabs; track t.id) {
          <button class="atab" [class.active]="tab()===t.id" (click)="tab.set(t.id); loadTab(t.id)"
                  [attr.data-testid]="t.tid">
            <i class="bi me-1" [class]="t.icon"></i>{{ t.label }}
          </button>
        }
      </div>

      <!-- ── PROVIDERS (5.4, 5.6, 5.8, 5.11) ──────────────────── -->
      @if (tab()==='providers') {
        <div class="atbl-card">
          <div class="atbl-hdr"><h6 class="atbl-title">All Providers</h6>
            <span class="nb-badge nb-badge-muted">{{ providers().length }}</span></div>
          @if (loadingTab()) { <div class="nb-spinner-wrap" style="min-height:160px"><div class="nb-spinner"></div></div> }
          @else {
            <div style="overflow-x:auto">
              <table class="atbl">
                <thead><tr>
                  <th>Business</th><th>Category</th><th>Views</th><th>Contacts</th>
                  <th>Rating</th><th>Ads</th><th>Status</th><th>Action</th>
                </tr></thead>
                <tbody>
                  @for (p of providers(); track p._id) {
                    <tr>
                      <td><div class="d-flex align-items-center gap-2">
                        <div class="uav" style="background:#059669">{{ p.businessName?.charAt(0) }}</div>
                        <div><div style="font-weight:600">{{ p.businessName }}</div>
                          <div class="text-muted-nb" style="font-size:.72rem">{{ p.user?.name }} · {{ p.user?.phone }}</div></div>
                      </div></td>
                      <td class="text-muted-nb">{{ p.category }}</td>
                      <td>{{ p.stats?.views }}</td>
                      <td>{{ p.stats?.contacts }}</td>
                      <td>{{ p.stats?.ratingAvg }}★ <span class="text-muted-nb" style="font-size:.72rem">({{ p.stats?.ratingCount }})</span></td>
                      <td>{{ p.stats?.adWatches }}</td>
                      <td><span class="nb-badge" [class.nb-badge-success]="p.status==='active'"
                                [class.nb-badge-danger]="p.status==='suspended'"
                                [class.nb-badge-warning]="p.status==='pending'">{{ p.status }}</span></td>
                      <td>
                        <div class="d-flex gap-2 flex-wrap">
                          <button class="aact-btn" style="font-size:.72rem;padding:4px 10px" (click)="chatUser(p.user?._id)"><i class="bi bi-chat-dots me-1"></i>Chat</button>
                          @if (p.status==='suspended') {
                            <button class="aact-btn approve" style="font-size:.72rem;padding:4px 10px" (click)="unbanProvider(p)">Reactivate</button>
                          } @else {
                            <button class="aact-btn reject" style="font-size:.72rem;padding:4px 10px" (click)="banProvider(p)">Deactivate</button>
                          }
                        </div>
                      </td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>
          }
        </div>
      }

      <!-- ── CUSTOMERS (5.5) ──────────────────────────────────── -->
      @if (tab()==='customers') {
        <div class="atbl-card">
          <div class="atbl-hdr"><h6 class="atbl-title">All Customers</h6>
            <span class="nb-badge nb-badge-muted">{{ customers().length }}</span></div>
          @if (loadingTab()) { <div class="nb-spinner-wrap" style="min-height:160px"><div class="nb-spinner"></div></div> }
          @else {
            <div style="overflow-x:auto">
              <table class="atbl">
                <thead><tr><th>Name</th><th>Phone</th><th>Contacts Made</th><th>Profiles Viewed</th><th>Joined</th><th>Status</th><th>Action</th></tr></thead>
                <tbody>
                  @for (c of customers(); track c._id) {
                    <tr>
                      <td><div class="d-flex align-items-center gap-2">
                        <div class="uav" style="background:#2563A8">{{ c.name?.charAt(0) }}</div>{{ c.name }}</div></td>
                      <td class="text-muted-nb">{{ c.phone }}</td>
                      <td>{{ c.activity?.contacts }}</td>
                      <td>{{ c.activity?.profileViews }}</td>
                      <td class="text-muted-nb" style="font-size:.8rem">{{ c.createdAt | date:'dd MMM yy' }}</td>
                      <td><span class="nb-badge" [class.nb-badge-success]="c.isActive" [class.nb-badge-danger]="!c.isActive">{{ c.isActive ? 'Active' : 'Banned' }}</span></td>
                      <td>
                        <div class="d-flex gap-2 flex-wrap">
                          <button class="aact-btn" style="font-size:.72rem;padding:4px 10px" (click)="chatUser(c._id)"><i class="bi bi-chat-dots me-1"></i>Chat</button>
                          @if (c.isActive) {
                            <button class="aact-btn reject" style="font-size:.72rem;padding:4px 10px" (click)="banUser(c._id, c.name)">Deactivate</button>
                          } @else {
                            <button class="aact-btn approve" style="font-size:.72rem;padding:4px 10px" (click)="reactivateUser(c._id, c.name)">Reactivate</button>
                          }
                        </div>
                      </td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>
          }
        </div>
      }

      <!-- ── COMPLAINTS (5.7) ─────────────────────────────────── -->
      @if (tab()==='complaints') {
        <div class="atbl-card">
          <div class="atbl-hdr">
            <h6 class="atbl-title">Complaints</h6>
            <span class="nb-badge" [class.nb-badge-danger]="complaintFilter()==='open'" [class.nb-badge-success]="complaintFilter()==='resolved'">
              {{ visibleComplaints().length }} {{ complaintFilter() }}
            </span>
          </div>

          <!-- Filter: switch between open and resolved complaints -->
          <div class="d-flex gap-2 mb-3 flex-wrap">
            <button class="fcat-chip" [class.on]="complaintFilter()==='open'" (click)="complaintFilter.set('open')">
              Open <span class="text-muted-nb">({{ openComplaints().length }})</span>
            </button>
            <button class="fcat-chip" [class.on]="complaintFilter()==='resolved'" (click)="complaintFilter.set('resolved')">
              Resolved <span class="text-muted-nb">({{ resolvedComplaints().length }})</span>
            </button>
          </div>

          @if (loadingTab()) { <div class="nb-spinner-wrap" style="min-height:160px"><div class="nb-spinner"></div></div> }
          @else if (visibleComplaints().length===0) {
            <p class="text-muted-nb text-center py-4">
              {{ complaintFilter()==='open' ? 'No open complaints' : 'No resolved complaints' }}
            </p>
          }
          @else {
            @for (c of visibleComplaints(); track c._id) {
              <div class="arow">
                <div class="arow-av" [style.background]="c.status==='resolved' ? '#059669' : '#DC2626'">
                  <i class="bi" [class.bi-check-lg]="c.status==='resolved'" [class.bi-exclamation]="c.status!=='resolved'"></i>
                </div>
                <div class="flex-grow-1">
                  <p class="arow-name">{{ c.type | titlecase }} — by {{ c.raisedBy?.name ?? '—' }}</p>
                  <p class="arow-meta">Against: {{ c.against?.name ?? '—' }} · {{ c.createdAt | date:'dd MMM' }}</p>
                  <p class="arow-desc">"{{ c.description }}"</p>
                  @if (c.evidence?.length) {
                    <div class="evid-strip">
                      @for (img of c.evidence; track img) {
                        <img class="evid-thumb" [src]="img" alt="evidence" (click)="lightbox.set(img)" />
                      }
                    </div>
                  }
                  @if (c.status==='resolved' && c.resolution) {
                    <p class="arow-meta" style="color:#059669"><i class="bi bi-check-circle me-1"></i>Resolved {{ c.resolvedAt | date:'dd MMM' }} — "{{ c.resolution }}"</p>
                  }
                </div>
                <div class="d-flex gap-2 align-items-start">
                  <button class="aact-btn" style="font-size:.72rem" (click)="chatComplaint(c)"><i class="bi bi-chat-dots me-1"></i>Chat</button>
                  @if (c.status!=='resolved') {
                    <button class="aact-btn approve" style="font-size:.72rem" (click)="resolveComplaint(c._id)">Resolve</button>
                  }
                </div>
              </div>
            }
          }
        </div>
      }

      <!-- ── CATEGORY REQUESTS ────────────────────────────────── -->
      @if (tab()==='category-requests') {
        <div class="atbl-card">
          <div class="atbl-hdr"><h6 class="atbl-title">Category Requests</h6>
            <span class="nb-badge nb-badge-warning">{{ pendingCatRequests() }} pending</span></div>
          @if (loadingTab()) { <div class="nb-spinner-wrap" style="min-height:160px"><div class="nb-spinner"></div></div> }
          @else if (catRequests().length===0) { <p class="text-muted-nb text-center py-4">No category requests yet.</p> }
          @else {
            @for (r of catRequests(); track r._id) {
              <div class="arow">
                <div class="arow-av" style="background:#7C3AED"><i class="bi bi-tag-fill"></i></div>
                <div class="flex-grow-1">
                  <p class="arow-name">{{ r.name }}
                    @if (r.status !== 'pending') { <span class="nb-badge" [class.nb-badge-success]="r.status==='approved'" [class.nb-badge-danger]="r.status==='rejected'">{{ r.status }}</span> }
                  </p>
                  <p class="arow-meta">{{ r.requestedBy?.name ?? '�' }}@if (r.providerId?.businessName) { � {{ r.providerId.businessName }}}@if (r.requestedBy?.phone) { � {{ r.requestedBy.phone }}} � {{ r.createdAt | date:'dd MMM yyyy' }}</p>
                  @if (r.note) { <p class="arow-desc">"{{ r.note }}"</p> }
                  @if (r.status === 'pending') { <p class="arow-desc" style="color:var(--nb-text-muted)">Approving publishes this category and moves the provider's listing onto it.</p> }
                </div>
                @if (r.status === 'pending') {
                  <div class="d-flex flex-column gap-1">
                    <button class="aact-btn approve" style="font-size:.72rem" (click)="reviewCategoryRequest(r._id, 'approved')">Approve</button>
                    <button class="aact-btn reject" style="font-size:.72rem" (click)="reviewCategoryRequest(r._id, 'rejected')">Reject</button>
                  </div>
                }
              </div>
            }
          }
        </div>
      }

      <!-- ── SETTINGS (5.12, 5.13) ────────────────────────────── -->
      @if (tab()==='settings') {
        @if (settings(); as s) {
          <div class="row g-3">
            <div class="col-lg-7">
              <div class="atbl-card mb-3">
                <h6 class="atbl-title mb-3">Feature Toggles</h6>
                <div class="set-row"><div><p class="set-t">OTP Verification</p><p class="set-d">Require phone OTP at sign-up / login</p></div>
                  <label class="sw"><input type="checkbox" [(ngModel)]="s.otpEnabled"><span></span></label></div>
                <div class="set-row"><div><p class="set-t">AdMob Ads</p><p class="set-d">Banner + rewarded master switch</p></div>
                  <label class="sw"><input type="checkbox" [(ngModel)]="s.adsEnabled"><span></span></label></div>
                <div class="set-row"><div><p class="set-t">Rewarded Ads</p></div>
                  <label class="sw"><input type="checkbox" [(ngModel)]="s.rewardedAdsEnabled"><span></span></label></div>
                <div class="set-row"><div><p class="set-t">"Who Visited" Feature</p></div>
                  <label class="sw"><input type="checkbox" [(ngModel)]="s.whoVisitedEnabled"><span></span></label></div>
                <div class="set-row"><div><p class="set-t">New Provider Registrations</p><p class="set-d">Freeze signups when off</p></div>
                  <label class="sw"><input type="checkbox" [(ngModel)]="s.registrationsEnabled"><span></span></label></div>
                <div class="set-row"><div><p class="set-t">Complaints</p></div>
                  <label class="sw"><input type="checkbox" [(ngModel)]="s.complaintsEnabled"><span></span></label></div>
                <div class="set-row"><div><p class="set-t">Ads required to unlock visitors</p></div>
                  <input type="number" class="nb-input" style="max-width:90px" min="1" max="5" [(ngModel)]="s.adsRequiredCount"></div>
                <button class="btn-nb-primary btn w-100 mt-3" (click)="saveSettings()" [disabled]="savingSettings()">
                  <i class="bi bi-check-circle me-2"></i>Save Settings</button>
              </div>

              <div class="atbl-card">
                <h6 class="atbl-title mb-3">Featured Categories (homepage)</h6>
                <div class="d-flex flex-wrap gap-2">
                  @for (cat of allCategories(); track cat.id) {
                    <button class="fcat-chip" [class.on]="s.featuredCategories.includes(cat.id)" (click)="toggleFeatured(cat.id)">{{ cat.label }}</button>
                  }
                </div>
              </div>
            </div>

            <div class="col-lg-5">
              <div class="atbl-card">
                <h6 class="atbl-title mb-3">Homepage Announcement</h6>
                <label class="set-t mb-1">Banner text</label>
                <textarea class="nb-input mb-2" rows="3" [(ngModel)]="s.announcement.text"
                          placeholder="e.g. Diwali offer — list free this week!"></textarea>
                <label class="sw-inline mb-3">
                  <input type="checkbox" [(ngModel)]="s.announcement.active"> <span>Show banner on homepage</span>
                </label>
                <button class="btn-nb-primary btn w-100" (click)="saveAnnouncement()">
                  <i class="bi bi-megaphone me-2"></i>Update Announcement</button>
              </div>
              <div class="atbl-card mt-3">
                <h6 class="atbl-title mb-2">AdMob Unit IDs (Phase 6)</h6>
                <label class="set-t">Banner Ad Unit</label>
                <input class="nb-input mb-2" [(ngModel)]="s.bannerAdUnitId" placeholder="ca-app-pub-…/…">
                <label class="set-t">Rewarded Ad Unit</label>
                <input class="nb-input" [(ngModel)]="s.rewardedAdUnitId" placeholder="ca-app-pub-…/…">
              </div>
            </div>
          </div>
        } @else { <div class="nb-spinner-wrap" style="min-height:160px"><div class="nb-spinner"></div></div> }
      }

      <!-- ── ACTIVITY LOG (5.14) ──────────────────────────────── -->
      @if (tab()==='logs') {
        <div class="atbl-card">
          <div class="atbl-hdr"><h6 class="atbl-title">Admin Activity Log</h6></div>
          @if (loadingTab()) { <div class="nb-spinner-wrap" style="min-height:160px"><div class="nb-spinner"></div></div> }
          @else if (logs().length===0) { <p class="text-muted-nb text-center py-4">No activity yet.</p> }
          @else {
            @for (l of logs(); track l._id) {
              <div class="arow">
                <div class="arow-av" style="background:#1A3C5E"><i class="bi bi-clock-history"></i></div>
                <div class="flex-grow-1">
                  <p class="arow-name">{{ l.action | titlecase }}</p>
                  <p class="arow-meta">{{ l.adminName }} · {{ l.createdAt | date:'dd MMM yyyy, h:mm a' }}</p>
                  @if (l.detail) { <p class="arow-desc">{{ l.detail }}</p> }
                </div>
              </div>
            }
          }
        </div>
      }
    </div>

    <!-- Evidence image lightbox -->
    @if (lightbox()) {
      <div class="evid-lightbox" (click)="lightbox.set(null)">
        <img [src]="lightbox()" alt="evidence" />
      </div>
    }
  `,
  styles: [`
    .evid-strip { display:flex; gap:8px; flex-wrap:wrap; margin:8px 0 2px; }
    .evid-thumb { width:56px; height:56px; object-fit:cover; border-radius:var(--radius-sm); border:1px solid var(--nb-border); cursor:pointer; transition:transform .12s; }
    .evid-thumb:hover { transform:scale(1.05); }
    .evid-lightbox { position:fixed; inset:0; background:rgba(0,0,0,.85); z-index:11000; display:flex; align-items:center; justify-content:center; padding:2rem; cursor:zoom-out; }
    .evid-lightbox img { max-width:92vw; max-height:92vh; border-radius:12px; }
    .kpi-grid { display:grid; grid-template-columns:repeat(auto-fill,minmax(190px,1fr)); gap:12px; }
    .kpi-card { background:#fff; border:1px solid var(--nb-border); border-radius:var(--radius-lg); padding:1.25rem; display:flex; align-items:center; gap:14px; }
    .kpi-icon { width:48px; height:48px; border-radius:var(--radius-md); display:flex; align-items:center; justify-content:center; font-size:1.3rem; flex-shrink:0; }
    .kpi-num  { font-family:var(--font-display); font-size:1.6rem; font-weight:800; margin:0; }
    .kpi-lbl  { font-size:.72rem; text-transform:uppercase; letter-spacing:.05em; color:var(--nb-text-muted); margin:0; }
    .atabs  { display:flex; gap:6px; flex-wrap:wrap; }
    .atab   { background:#fff; border:1.5px solid var(--nb-border); border-radius:var(--radius-md); padding:8px 18px; font-family:var(--font-display); font-size:.8rem; font-weight:700; text-transform:uppercase; letter-spacing:.04em; color:var(--nb-text-muted); cursor:pointer; transition:all .2s; }
    .atab.active { background:var(--nb-primary); border-color:var(--nb-primary); color:#fff; }
    .atbl-card  { background:#fff; border:1px solid var(--nb-border); border-radius:var(--radius-lg); padding:1.25rem; }
    .atbl-hdr   { display:flex; justify-content:space-between; align-items:center; margin-bottom:1rem; flex-wrap:wrap; gap:8px; }
    .atbl-title { font-family:var(--font-display); font-weight:700; margin:0; }
    .arow  { display:flex; align-items:flex-start; gap:12px; padding:12px 0; border-bottom:1px solid var(--nb-border); }
    .arow:last-child { border-bottom:none; }
    .arow-av { width:40px; height:40px; min-width:40px; border-radius:50%; display:flex; align-items:center; justify-content:center; font-family:var(--font-display); font-weight:800; color:#fff; font-size:1rem; }
    .arow-name { font-family:var(--font-display); font-weight:700; font-size:.9rem; margin:0; }
    .arow-meta { font-size:.75rem; color:var(--nb-text-muted); margin:2px 0 0; }
    .arow-desc { font-size:.8rem; color:var(--nb-text-muted); margin:4px 0 0; font-style:italic; }
    .aact-btn  { border:none; border-radius:var(--radius-sm); padding:6px 14px; font-family:var(--font-display); font-size:.78rem; font-weight:700; cursor:pointer; transition:all .15s; display:flex; align-items:center; white-space:nowrap; }
    .aact-btn.approve { background:#D1FAE5; color:#065f46; }
    .aact-btn.reject  { background:#FEE2E2; color:#991b1b; }
    .aact-btn:not(.approve):not(.reject) { background:#EFF6FF; color:#1e4d8c; }
    .atbl { width:100%; border-collapse:collapse; font-size:.875rem; }
    .atbl th { font-family:var(--font-display); font-size:.72rem; font-weight:700; text-transform:uppercase; letter-spacing:.05em; color:var(--nb-text-muted); padding:10px 12px; text-align:left; border-bottom:2px solid var(--nb-border); }
    .atbl td { padding:10px 12px; border-bottom:1px solid var(--nb-border); vertical-align:middle; }
    .atbl tr:last-child td { border-bottom:none; }
    .atbl tr:hover td { background:var(--nb-surface-2); }
    .uav { width:28px; height:28px; min-width:28px; border-radius:50%; display:flex; align-items:center; justify-content:center; font-family:var(--font-display); font-weight:700; color:#fff; font-size:.75rem; }
    /* settings */
    .set-row { display:flex; justify-content:space-between; align-items:center; padding:10px 0; border-bottom:1px solid var(--nb-border); gap:12px; }
    .set-row:last-of-type { border-bottom:none; }
    .set-t { font-weight:600; font-size:.875rem; margin:0; }
    .set-d { font-size:.72rem; color:var(--nb-text-muted); margin:2px 0 0; }
    .sw { position:relative; display:inline-block; width:44px; height:24px; flex-shrink:0; }
    .sw input { opacity:0; width:0; height:0; }
    .sw span { position:absolute; cursor:pointer; inset:0; background:var(--nb-border); border-radius:24px; transition:.2s; }
    .sw span::before { content:''; position:absolute; height:18px; width:18px; left:3px; bottom:3px; background:#fff; border-radius:50%; transition:.2s; }
    .sw input:checked + span { background:var(--nb-success); }
    .sw input:checked + span::before { transform:translateX(20px); }
    .sw-inline { display:flex; align-items:center; gap:8px; font-size:.85rem; cursor:pointer; }
    .fcat-chip { background:var(--nb-bg); border:1.5px solid var(--nb-border); border-radius:20px; padding:6px 14px; font-size:.8rem; font-weight:600; cursor:pointer; transition:all .15s; }
    .fcat-chip.on { background:var(--nb-accent); border-color:var(--nb-accent); color:var(--nb-primary); }
  `]
})
export class AdminDashboardComponent implements OnInit {
  tab            = signal('providers');
  loadingTab     = signal(false);
  kpis           = signal<any[]>([]);
  providers      = signal<any[]>([]);
  customers      = signal<any[]>([]);
  complaints         = signal<any[]>([]);
  complaintFilter    = signal<'open' | 'resolved'>('open');
  openComplaints     = computed(() => this.complaints().filter(c => c.status === 'open'));
  resolvedComplaints = computed(() => this.complaints().filter(c => c.status === 'resolved'));
  visibleComplaints  = computed(() => this.complaintFilter() === 'open' ? this.openComplaints() : this.resolvedComplaints());
  catRequests    = signal<any[]>([]);
  logs           = signal<any[]>([]);
  settings       = signal<Settings | null>(null);
  savingSettings = signal(false);
  lightbox       = signal<string | null>(null);

  // Full canonical category list (id + label), loaded from /api/categories.
  // Falls back to a minimal set if the request fails.
  allCategories = signal<{ id: string; label: string }[]>([
    { id: 'home_services', label: 'Home Services' },
    { id: 'education',     label: 'Education' },
    { id: 'food',          label: 'Food' },
    { id: 'wellness',      label: 'Wellness' },
    { id: 'events',        label: 'Events' },
  ]);

  tabs = [
    { id:'providers',  label:'Providers',  icon:'bi-briefcase',            tid:'providers-tab' },
    { id:'customers',  label:'Customers',  icon:'bi-people',               tid:'customers-tab' },
    { id:'complaints', label:'Complaints', icon:'bi-exclamation-triangle', tid:'complaints-tab' },
    { id:'category-requests', label:'Category Requests', icon:'bi-tags', tid:'category-requests-tab' },
    { id:'settings',   label:'Settings',   icon:'bi-sliders',              tid:'settings-tab' },
    { id:'logs',       label:'Activity Log', icon:'bi-clock-history',      tid:'logs-tab' },
  ];

  constructor(
    private api: ApiService,
    private toast: ToastService,
    private chat: ChatService,
    private router: Router,
    private dialog: DialogService,
    private route: ActivatedRoute,
  ) {}

  // Open a support chat with any user (provider/customer) from the admin panel.
  chatUser(userId: string, draft = '') {
    if (!userId) { this.toast.error('This account has no linked user.'); return; }
    this.chat.openSupport(userId).subscribe({
      next: c => this.router.navigate(['/chat', c._id], draft ? { queryParams: { draft } } : {}),
      error: () => this.toast.error('Could not open chat.'),
    });
  }

  // Open a support chat with the user who raised a complaint, pre-filled with its reference + details.
  chatComplaint(c: any) {
    this.chat.openComplaintChat(c._id).subscribe({
      next: conv => {
        const ref   = 'CMP-' + String(c._id).slice(-6).toUpperCase();
        const draft =
          `Hello ${c.raisedBy?.name ?? ''}, NearBy Support here regarding your complaint ` +
          `${ref} (${c.type}) against ${c.against?.name ?? 'the provider'}: "${c.description}". ` +
          `Could you share more details so we can help resolve this?`;
        this.router.navigate(['/chat', conv._id], { queryParams: { draft } });
      },
      error: () => this.toast.error('Could not open chat.'),
    });
  }

  ngOnInit() {
    this.api.get<any>('/admin/dashboard').subscribe({
      next: res => {
        const d = res.data;
        this.kpis.set([
          { label:'Customers',        val: d.customers,          icon:'bi-people-fill',    bg:'#EFF6FF', ic:'#2563A8', tid:'total-customers' },
          { label:'Active Providers', val: d.activeProviders,    icon:'bi-briefcase-fill', bg:'#D1FAE5', ic:'#059669', tid:'total-providers' },
          { label:'Total Contacts',   val: d.contacts,           icon:'bi-telephone-fill', bg:'#FEF3C7', ic:'#D97706', tid:'total-contacts' },
          { label:'Active Ads',       val: d.activeAds?'On':'Off', icon:'bi-badge-ad',     bg:'#EDE9FE', ic:'#7C3AED', tid:'active-ads' },
          { label:'Open Complaints',  val: d.openComplaints,     icon:'bi-flag-fill',      bg:'#FEE2E2', ic:'#DC2626', tid:'open-complaints' },
        ]);
      },
      error: () => this.kpis.set([]),
    });
    // Load the full category list for the Featured Categories chips.
    this.api.get<any>('/categories').subscribe({
      next: res => {
        const list = (res.data ?? []).map((c: any) => ({ id: c.id, label: c.label }));
        if (list.length) this.allCategories.set(list);
      },
      error: () => { /* keep fallback list */ },
    });

    // Honour ?tab=… deep links (e.g. the "New complaint filed" notification → complaints).
    // Subscribing handles both first load and clicks while already on /admin.
    this.route.queryParamMap.subscribe(params => {
      const requested = params.get('tab');
      const valid = this.tabs.some(t => t.id === requested);
      const target = valid ? requested! : 'providers';
      if (target !== this.tab() || !this.kpis().length) {
        this.tab.set(target);
        this.loadTab(target);
      }
    });
  }

  loadTab(id: string) {
    this.loadingTab.set(true);
    const done = () => this.loadingTab.set(false);
    if (id === 'providers') {
      this.api.get<any>('/admin/providers').subscribe({ next: r => { this.providers.set(r.data ?? []); done(); }, error: done });
    } else if (id === 'customers') {
      this.api.get<any>('/admin/customers').subscribe({ next: r => { this.customers.set(r.data ?? []); done(); }, error: done });
    } else if (id === 'complaints') {
      this.api.get<any>('/complaints').subscribe({ next: r => { this.complaints.set(r.data ?? []); done(); }, error: done });
    } else if (id === 'category-requests') {
      this.api.get<any>('/categories/requests').subscribe({ next: r => { this.catRequests.set(r.data ?? []); done(); }, error: done });
    } else if (id === 'settings') {
      this.api.get<ApiResponse<Settings>>('/admin/settings').subscribe({ next: r => { this.settings.set(r.data); done(); }, error: done });
    } else if (id === 'logs') {
      this.api.get<any>('/admin/logs').subscribe({ next: r => { this.logs.set(r.data ?? []); done(); }, error: done });
    } else { done(); }
  }

  async banProvider(p: any) {
    const reason = await this.dialog.prompt(
      `"${p.businessName}" will lose their listing and can no longer log in.`,
      { title: 'Deactivate Provider', placeholder: 'Optional reason (shown to them)', confirmText: 'Deactivate', danger: true },
    );
    if (reason === null) return;
    this.api.put<any>(`/admin/providers/${p._id}/ban`, { reason }).subscribe({
      next: () => { this.toast.success(`${p.businessName} deactivated.`); this.loadTab('providers'); },
      error: () => this.toast.error('Could not deactivate provider.'),
    });
  }

  unbanProvider(p: any) {
    this.api.put<any>(`/admin/providers/${p._id}/unban`, {}).subscribe({
      next: () => { this.toast.success(`${p.businessName} reactivated.`); this.loadTab('providers'); },
      error: () => this.toast.error('Could not reactivate provider.'),
    });
  }

  async banUser(id: string, name: string) {
    const ok = await this.dialog.confirm(
      `${name} will be unable to log in until reactivated.`,
      { title: 'Deactivate Customer', confirmText: 'Deactivate', danger: true },
    );
    if (!ok) return;
    this.api.put<any>(`/admin/users/${id}/ban`, {}).subscribe({
      next: () => { this.toast.success(`${name} deactivated.`); this.customers.update(l => l.map(u => u._id === id ? { ...u, isActive: false } : u)); },
      error: () => this.toast.error('Could not deactivate user.'),
    });
  }

  reactivateUser(id: string, name: string) {
    this.api.put<any>(`/admin/users/${id}/unban`, {}).subscribe({
      next: () => { this.toast.success(`${name} reactivated.`); this.customers.update(l => l.map(u => u._id === id ? { ...u, isActive: true } : u)); },
      error: () => this.toast.error('Could not reactivate user.'),
    });
  }

  async resolveComplaint(id: string) {
    const note = await this.dialog.prompt(
      'Add a note describing how this complaint was resolved.',
      { title: 'Resolve Complaint', placeholder: 'Resolution note', confirmText: 'Resolve', multiline: true },
    );
    if (note === null) return;
    const resolution = note.trim() || 'Resolved by admin';
    this.api.put<any>(`/complaints/${id}/resolve`, { resolution }).subscribe({
      next: () => { this.toast.success('Complaint resolved.'); this.complaints.update(l => l.map(c => c._id === id ? { ...c, status: 'resolved', resolution, resolvedAt: new Date() } : c)); this.complaintFilter.set('resolved'); },
      error: () => this.toast.error('Could not resolve complaint.'),
    });
  }

  pendingCatRequests() { return this.catRequests().filter(r => r.status === 'pending').length; }

  reviewCategoryRequest(id: string, status: 'approved' | 'rejected') {
    this.api.put<any>(`/categories/requests/${id}`, { status }).subscribe({
      next: () => {
        this.toast.success(`Request ${status}.`);
        this.catRequests.update(l => l.map(r => r._id === id ? { ...r, status } : r));
      },
      error: () => this.toast.error('Could not update request.'),
    });
  }

  toggleFeatured(cat: string) {
    const s = this.settings(); if (!s) return;
    s.featuredCategories = s.featuredCategories.includes(cat)
      ? s.featuredCategories.filter(c => c !== cat)
      : [...s.featuredCategories, cat];
    this.settings.set({ ...s });
  }

  saveSettings() {
    const s = this.settings(); if (!s) return;
    this.savingSettings.set(true);
    this.api.put<any>('/admin/settings', s).subscribe({
      next: () => { this.savingSettings.set(false); this.toast.success('Settings saved.'); },
      error: () => { this.savingSettings.set(false); this.toast.error('Could not save settings.'); },
    });
  }

  saveAnnouncement() {
    const s = this.settings(); if (!s) return;
    this.api.put<any>('/admin/announcement', s.announcement).subscribe({
      next: () => this.toast.success('Announcement updated.'),
      error: () => this.toast.error('Could not update announcement.'),
    });
  }
}
