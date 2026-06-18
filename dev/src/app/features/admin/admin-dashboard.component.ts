// src/app/features/admin/admin-dashboard.component.ts
import { Component, OnInit, signal } from '@angular/core';
import { CommonModule }  from '@angular/common';
import { FormsModule }   from '@angular/forms';
import { RouterLink }    from '@angular/router';
import { ApiService, ApiResponse } from '../../core/services/api.service';
import { ToastService }  from '../../core/services/toast.service';

interface Settings {
  otpEnabled: boolean; otpCustomerEnabled: boolean; otpProviderEnabled: boolean;
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
                        @if (p.status==='suspended') {
                          <button class="aact-btn approve" style="font-size:.72rem;padding:4px 10px" (click)="unbanProvider(p)">Reinstate</button>
                        } @else {
                          <button class="aact-btn reject" style="font-size:.72rem;padding:4px 10px" (click)="banProvider(p)">Suspend</button>
                        }
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
                      <td>@if (c.isActive) { <button class="aact-btn reject" style="font-size:.72rem;padding:4px 10px" (click)="banUser(c._id, c.name)">Ban</button> }</td>
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
          <div class="atbl-hdr"><h6 class="atbl-title">Open Complaints</h6>
            <span class="nb-badge nb-badge-danger">{{ openComplaints().length }} open</span></div>
          @if (loadingTab()) { <div class="nb-spinner-wrap" style="min-height:160px"><div class="nb-spinner"></div></div> }
          @else if (openComplaints().length===0) { <p class="text-muted-nb text-center py-4">✅ No open complaints</p> }
          @else {
            @for (c of openComplaints(); track c._id) {
              <div class="arow">
                <div class="arow-av" style="background:#DC2626">!</div>
                <div class="flex-grow-1">
                  <p class="arow-name">{{ c.type | titlecase }} — by {{ c.raisedBy?.name ?? '—' }}</p>
                  <p class="arow-meta">Against: {{ c.against?.name ?? '—' }} · {{ c.createdAt | date:'dd MMM' }}</p>
                  <p class="arow-desc">"{{ c.description }}"</p>
                </div>
                <button class="aact-btn approve" style="font-size:.72rem" (click)="resolveComplaint(c._id)">Resolve</button>
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
                <div class="set-row"><div><p class="set-t">OTP Verification</p><p class="set-d">Master switch for phone OTP</p></div>
                  <label class="sw"><input type="checkbox" [(ngModel)]="s.otpEnabled"><span></span></label></div>
                <div class="set-row"><div><p class="set-t">— Customer OTP</p></div>
                  <label class="sw"><input type="checkbox" [(ngModel)]="s.otpCustomerEnabled"><span></span></label></div>
                <div class="set-row"><div><p class="set-t">— Provider OTP</p></div>
                  <label class="sw"><input type="checkbox" [(ngModel)]="s.otpProviderEnabled"><span></span></label></div>
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
                  @for (cat of allCategories; track cat) {
                    <button class="fcat-chip" [class.on]="s.featuredCategories.includes(cat)" (click)="toggleFeatured(cat)">{{ cat }}</button>
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
  `,
  styles: [`
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
  openComplaints = signal<any[]>([]);
  logs           = signal<any[]>([]);
  settings       = signal<Settings | null>(null);
  savingSettings = signal(false);

  allCategories = ['home_services','education','food','wellness','events'];

  tabs = [
    { id:'providers',  label:'Providers',  icon:'bi-briefcase',            tid:'providers-tab' },
    { id:'customers',  label:'Customers',  icon:'bi-people',               tid:'customers-tab' },
    { id:'complaints', label:'Complaints', icon:'bi-exclamation-triangle', tid:'complaints-tab' },
    { id:'settings',   label:'Settings',   icon:'bi-sliders',              tid:'settings-tab' },
    { id:'logs',       label:'Activity Log', icon:'bi-clock-history',      tid:'logs-tab' },
  ];

  constructor(private api: ApiService, private toast: ToastService) {}

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
    this.loadTab('providers');
  }

  loadTab(id: string) {
    this.loadingTab.set(true);
    const done = () => this.loadingTab.set(false);
    if (id === 'providers') {
      this.api.get<any>('/admin/providers').subscribe({ next: r => { this.providers.set(r.data ?? []); done(); }, error: done });
    } else if (id === 'customers') {
      this.api.get<any>('/admin/customers').subscribe({ next: r => { this.customers.set(r.data ?? []); done(); }, error: done });
    } else if (id === 'complaints') {
      this.api.get<any>('/complaints').subscribe({ next: r => { this.openComplaints.set((r.data ?? []).filter((c: any) => c.status === 'open')); done(); }, error: done });
    } else if (id === 'settings') {
      this.api.get<ApiResponse<Settings>>('/admin/settings').subscribe({ next: r => { this.settings.set(r.data); done(); }, error: done });
    } else if (id === 'logs') {
      this.api.get<any>('/admin/logs').subscribe({ next: r => { this.logs.set(r.data ?? []); done(); }, error: done });
    } else { done(); }
  }

  banProvider(p: any) {
    const reason = prompt(`Suspend "${p.businessName}"? Optional reason (shown on their listing):`);
    if (reason === null) return;
    this.api.put<any>(`/admin/providers/${p._id}/ban`, { reason }).subscribe({
      next: () => { this.toast.success(`${p.businessName} suspended.`); this.loadTab('providers'); },
      error: () => this.toast.error('Could not suspend provider.'),
    });
  }

  unbanProvider(p: any) {
    this.api.put<any>(`/admin/providers/${p._id}/unban`, {}).subscribe({
      next: () => { this.toast.success(`${p.businessName} reinstated.`); this.loadTab('providers'); },
      error: () => this.toast.error('Could not reinstate provider.'),
    });
  }

  banUser(id: string, name: string) {
    if (!confirm(`Ban ${name}?`)) return;
    this.api.put<any>(`/admin/users/${id}/ban`, {}).subscribe({
      next: () => { this.toast.success(`${name} banned.`); this.customers.update(l => l.map(u => u._id === id ? { ...u, isActive: false } : u)); },
      error: () => this.toast.error('Could not ban user.'),
    });
  }

  resolveComplaint(id: string) {
    const resolution = prompt('Resolution note:') ?? 'Resolved by admin';
    this.api.put<any>(`/complaints/${id}/resolve`, { resolution }).subscribe({
      next: () => { this.toast.success('Complaint resolved.'); this.openComplaints.update(l => l.filter(c => c._id !== id)); },
      error: () => this.toast.error('Could not resolve complaint.'),
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
