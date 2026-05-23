// src/app/features/admin/admin-dashboard.component.ts
import { Component, OnInit, signal } from '@angular/core';
import { CommonModule }  from '@angular/common';
import { FormsModule }   from '@angular/forms';
import { RouterLink }    from '@angular/router';
import { ApiService }    from '../../core/services/api.service';
import { ToastService }  from '../../core/services/toast.service';

@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  template: `
    <div class="container-fluid py-4 px-4">

      <!-- Header -->
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

      <!-- Tabs -->
      <div class="atabs mb-3">
        @for (t of tabs; track t.id) {
          <button class="atab" [class.active]="tab()===t.id"
                  (click)="tab.set(t.id); loadTab(t.id)"
                  [attr.data-testid]="t.tid">
            <i class="bi me-1" [class]="t.icon"></i>{{ t.label }}
            @if (t.badge) { <span class="tbadge">{{ t.badge }}</span> }
          </button>
        }
      </div>

      <!-- ── PENDING PROVIDERS ───────────────────────────────── -->
      @if (tab()==='providers') {
        <div class="atbl-card">
          <div class="atbl-hdr">
            <h6 class="atbl-title">Pending Provider Approvals</h6>
            <span class="nb-badge nb-badge-warning">{{ pendingProviders().length }} awaiting</span>
          </div>
          @if (loadingTab()) {
            <div class="nb-spinner-wrap" style="min-height:160px"><div class="nb-spinner"></div></div>
          } @else if (pendingProviders().length===0) {
            <p class="text-muted-nb text-center py-4">✅ No pending providers</p>
          } @else {
            @for (p of pendingProviders(); track p._id) {
              <div class="arow" data-testid="pending-provider-card">
                <div class="arow-av" [style.background]="catColor(p.category)">{{ p.businessName?.charAt(0) }}</div>
                <div class="flex-grow-1">
                  <p class="arow-name">{{ p.businessName }}</p>
                  <p class="arow-meta">{{ catLabel(p.category) }} · {{ p.userId?.email ?? '—' }} · Applied {{ p.createdAt | date:'dd MMM' }}</p>
                </div>
                <div class="d-flex gap-2">
                  <button class="aact-btn approve" (click)="approveProvider(p._id)" data-testid="approve-btn">
                    <i class="bi bi-check-lg me-1"></i>Approve
                  </button>
                  <button class="aact-btn reject" (click)="rejectProvider(p._id)">
                    <i class="bi bi-x-lg me-1"></i>Reject
                  </button>
                </div>
              </div>
            }
          }
        </div>
      }

      <!-- ── OPEN COMPLAINTS ──────────────────────────────────── -->
      @if (tab()==='complaints') {
        <div class="atbl-card">
          <div class="atbl-hdr">
            <h6 class="atbl-title">Open Complaints</h6>
            <span class="nb-badge nb-badge-danger">{{ openComplaints().length }} open</span>
          </div>
          @if (loadingTab()) {
            <div class="nb-spinner-wrap" style="min-height:160px"><div class="nb-spinner"></div></div>
          } @else if (openComplaints().length===0) {
            <p class="text-muted-nb text-center py-4">✅ No open complaints</p>
          } @else {
            @for (c of openComplaints(); track c._id) {
              <div class="arow">
                <div class="arow-av" style="background:#DC2626">!</div>
                <div class="flex-grow-1">
                  <p class="arow-name">{{ c.type | titlecase }} — by {{ c.raisedBy?.name ?? '—' }}</p>
                  <p class="arow-meta">Against: {{ c.against?.name ?? '—' }} · {{ c.createdAt | date:'dd MMM' }}</p>
                  <p class="arow-desc">"{{ c.description | slice:0:120 }}..."</p>
                </div>
                <div class="d-flex flex-column align-items-end gap-2">
                  <span class="nb-badge nb-badge-warning">Open</span>
                  <button class="aact-btn approve" style="font-size:.72rem" (click)="resolveComplaint(c._id)">
                    Resolve
                  </button>
                </div>
              </div>
            }
          }
        </div>
      }

      <!-- ── ALL USERS ────────────────────────────────────────── -->
      @if (tab()==='users') {
        <div class="atbl-card">
          <div class="atbl-hdr">
            <h6 class="atbl-title">All Users</h6>
            <input type="text" class="nb-input" style="max-width:240px;padding:6px 12px;font-size:.8rem"
                   [(ngModel)]="userSearch" (ngModelChange)="searchUsers()"
                   placeholder="Search by name or email..." />
          </div>
          @if (loadingTab()) {
            <div class="nb-spinner-wrap" style="min-height:160px"><div class="nb-spinner"></div></div>
          } @else {
            <div style="overflow-x:auto">
              <table class="atbl">
                <thead>
                  <tr>
                    <th>Name</th><th>Email</th><th>Role</th><th>Joined</th><th>Status</th><th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  @for (u of users(); track u._id) {
                    <tr>
                      <td>
                        <div class="d-flex align-items-center gap-2">
                          <div class="uav" style="background:#2563A8">{{ u.name?.charAt(0) }}</div>
                          {{ u.name }}
                        </div>
                      </td>
                      <td class="text-muted-nb">{{ u.email }}</td>
                      <td>
                        <span class="nb-badge"
                              [class.nb-badge-primary]="u.role==='customer'"
                              [class.nb-badge-success]="u.role==='provider'"
                              [class.nb-badge-danger]="u.role==='admin'">
                          {{ u.role }}
                        </span>
                      </td>
                      <td class="text-muted-nb" style="font-size:.8rem">{{ u.createdAt | date:'dd MMM yy' }}</td>
                      <td>
                        <span class="nb-badge" [class.nb-badge-success]="u.isActive" [class.nb-badge-danger]="!u.isActive">
                          {{ u.isActive ? 'Active' : 'Banned' }}
                        </span>
                      </td>
                      <td>
                        @if (u.isActive) {
                          <button class="aact-btn reject" style="font-size:.72rem;padding:4px 10px"
                                  (click)="banUser(u._id, u.name)">Ban</button>
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

    </div>
  `,
  styles: [`
    .kpi-grid { display:grid; grid-template-columns:repeat(auto-fill,minmax(200px,1fr)); gap:12px; }
    .kpi-card { background:#fff; border:1px solid var(--nb-border); border-radius:var(--radius-lg); padding:1.25rem; display:flex; align-items:center; gap:14px; }
    .kpi-icon { width:48px; height:48px; border-radius:var(--radius-md); display:flex; align-items:center; justify-content:center; font-size:1.3rem; flex-shrink:0; }
    .kpi-num  { font-family:var(--font-display); font-size:1.6rem; font-weight:800; margin:0; }
    .kpi-lbl  { font-size:.72rem; text-transform:uppercase; letter-spacing:.05em; color:var(--nb-text-muted); margin:0; }
    .atabs  { display:flex; gap:6px; flex-wrap:wrap; }
    .atab   { background:#fff; border:1.5px solid var(--nb-border); border-radius:var(--radius-md); padding:8px 18px; font-family:var(--font-display); font-size:.8rem; font-weight:700; text-transform:uppercase; letter-spacing:.04em; color:var(--nb-text-muted); cursor:pointer; transition:all .2s; position:relative; }
    .atab.active { background:var(--nb-primary); border-color:var(--nb-primary); color:#fff; }
    .tbadge { position:absolute; top:-8px; right:-8px; background:var(--nb-danger); color:#fff; border-radius:20px; padding:1px 7px; font-size:.65rem; font-weight:700; }
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
    .aact-btn.approve:hover { background:#A7F3D0; }
    .aact-btn.reject  { background:#FEE2E2; color:#991b1b; }
    .aact-btn.reject:hover  { background:#FECACA; }
    .atbl { width:100%; border-collapse:collapse; font-size:.875rem; }
    .atbl th { font-family:var(--font-display); font-size:.72rem; font-weight:700; text-transform:uppercase; letter-spacing:.05em; color:var(--nb-text-muted); padding:10px 12px; text-align:left; border-bottom:2px solid var(--nb-border); }
    .atbl td { padding:10px 12px; border-bottom:1px solid var(--nb-border); }
    .atbl tr:last-child td { border-bottom:none; }
    .atbl tr:hover td { background:var(--nb-surface-2); }
    .uav { width:28px; height:28px; min-width:28px; border-radius:50%; display:flex; align-items:center; justify-content:center; font-family:var(--font-display); font-weight:700; color:#fff; font-size:.75rem; }
  `]
})
export class AdminDashboardComponent implements OnInit {
  tab              = signal('providers');
  loadingTab       = signal(false);
  kpis             = signal<any[]>([]);
  pendingProviders = signal<any[]>([]);
  openComplaints   = signal<any[]>([]);
  users            = signal<any[]>([]);
  userSearch       = '';
  private searchTimer: any;

  tabs = [
    { id:'providers',  label:'Pending Providers', icon:'bi-person-badge',        tid:'pending-providers-tab', badge:0 },
    { id:'complaints', label:'Open Complaints',   icon:'bi-exclamation-triangle', tid:'complaints-tab',        badge:0 },
    { id:'users',      label:'All Users',          icon:'bi-people',               tid:'users-tab',             badge:0 },
  ];

  constructor(private api: ApiService, private toast: ToastService) {}

  ngOnInit() {
    // Load dashboard KPIs
    this.api.get<any>('/admin/dashboard').subscribe({
      next: res => {
        const d = res.data;
        this.kpis.set([
          { label:'Total Users',     val: d.users,            icon:'bi-people-fill',         bg:'#EFF6FF', ic:'#2563A8', tid:'total-users' },
          { label:'Active Providers',val: d.activeProviders,  icon:'bi-briefcase-fill',      bg:'#D1FAE5', ic:'#059669', tid:'total-providers' },
          { label:'Total Bookings',  val: d.bookings,         icon:'bi-calendar-check-fill', bg:'#FEF3C7', ic:'#D97706', tid:'total-bookings' },
          { label:'Open Complaints', val: d.openComplaints,   icon:'bi-flag-fill',           bg:'#FEE2E2', ic:'#DC2626', tid:'open-complaints' },
        ]);
      },
      error: () => {
        this.kpis.set([
          { label:'Total Users',     val:'—', icon:'bi-people-fill',         bg:'#EFF6FF', ic:'#2563A8', tid:'total-users' },
          { label:'Active Providers',val:'—', icon:'bi-briefcase-fill',      bg:'#D1FAE5', ic:'#059669', tid:'total-providers' },
          { label:'Total Bookings',  val:'—', icon:'bi-calendar-check-fill', bg:'#FEF3C7', ic:'#D97706', tid:'total-bookings' },
          { label:'Open Complaints', val:'—', icon:'bi-flag-fill',           bg:'#FEE2E2', ic:'#DC2626', tid:'open-complaints' },
        ]);
      },
    });
    this.loadTab('providers');
  }

  loadTab(id: string) {
    this.loadingTab.set(true);
    if (id === 'providers') {
      this.api.get<any>('/admin/providers/pending').subscribe({
        next: res => { this.pendingProviders.set(res.data ?? []); this.loadingTab.set(false); },
        error: () => this.loadingTab.set(false),
      });
    } else if (id === 'complaints') {
      this.api.get<any>('/complaints').subscribe({
        next: res => {
          this.openComplaints.set((res.data ?? []).filter((c: any) => c.status === 'open'));
          this.loadingTab.set(false);
        },
        error: () => this.loadingTab.set(false),
      });
    } else if (id === 'users') {
      this.api.get<any>('/admin/users').subscribe({
        next: res => { this.users.set(res.data ?? []); this.loadingTab.set(false); },
        error: () => this.loadingTab.set(false),
      });
    }
  }

  approveProvider(id: string) {
    this.api.put<any>(`/providers/${id}/status`, { status:'active' }).subscribe({
      next: () => {
        this.toast.success('Provider approved and notified!');
        this.pendingProviders.update(list => list.filter(p => p._id !== id));
      },
      error: () => this.toast.error('Could not approve provider.'),
    });
  }

  rejectProvider(id: string) {
    this.api.put<any>(`/providers/${id}/status`, { status:'suspended' }).subscribe({
      next: () => {
        this.toast.info('Provider rejected.');
        this.pendingProviders.update(list => list.filter(p => p._id !== id));
      },
      error: () => this.toast.error('Could not reject provider.'),
    });
  }

  resolveComplaint(id: string) {
    const resolution = prompt('Enter resolution note:') ?? 'Resolved by admin';
    this.api.put<any>(`/complaints/${id}/resolve`, { resolution }).subscribe({
      next: () => {
        this.toast.success('Complaint resolved.');
        this.openComplaints.update(list => list.filter(c => c._id !== id));
      },
      error: () => this.toast.error('Could not resolve complaint.'),
    });
  }

  banUser(id: string, name: string) {
    if (!confirm(`Ban user ${name}? They will not be able to login.`)) return;
    this.api.put<any>(`/admin/users/${id}/ban`, {}).subscribe({
      next: () => {
        this.toast.success(`${name} has been banned.`);
        this.users.update(list => list.map(u => u._id === id ? { ...u, isActive: false } : u));
      },
      error: () => this.toast.error('Could not ban user.'),
    });
  }

  searchUsers() {
    clearTimeout(this.searchTimer);
    this.searchTimer = setTimeout(() => {
      this.loadingTab.set(true);
      this.api.get<any>('/admin/users', this.userSearch ? { search: this.userSearch } : {}).subscribe({
        next: res => { this.users.set(res.data ?? []); this.loadingTab.set(false); },
        error: () => this.loadingTab.set(false),
      });
    }, 400);
  }

  catColor(id: string) {
    const m: Record<string,string> = { home_services:'#2563A8', education:'#059669', food:'#D97706', wellness:'#7C3AED', events:'#DC2626' };
    return m[id] ?? '#1A3C5E';
  }
  catLabel(id: string) {
    const m: Record<string,string> = { home_services:'Home Services', education:'Education', food:'Food', wellness:'Wellness', events:'Events' };
    return m[id] ?? id;
  }
}
