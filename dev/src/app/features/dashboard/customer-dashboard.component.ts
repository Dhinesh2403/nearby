// src/app/features/dashboard/customer-dashboard.component.ts
import { Component, OnInit, signal } from '@angular/core';
import { CommonModule }  from '@angular/common';
import { RouterLink, Router } from '@angular/router';
import { AuthService }   from '../../core/auth/auth.service';
import { ApiService, ApiResponse } from '../../core/services/api.service';
import { CategoryService } from '../../core/services/category.service';
import { ChatService }   from '../../core/services/chat.service';
import { ToastService }  from '../../core/services/toast.service';

interface ContactEntry { providerId: any; channel: string; createdAt: string; }

@Component({
  selector: 'app-customer-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <div class="container py-4">

      <!-- Header -->
      <div class="dash-hdr mb-4" data-testid="dashboard-welcome">
        <div>
          <h2 class="section-title">Welcome back, {{ firstName() }}!</h2>
          <p class="section-sub mb-0">Find and connect with trusted local providers</p>
        </div>
        <a routerLink="/browse" class="btn-nb-primary btn">
          <i class="bi bi-search me-1"></i>Find Services
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

        <!-- My Contacts -->
        <div class="col-md-8" data-testid="contacts-section">
          <div class="ds-card">
            <div class="ds-hdr">
              <h6 class="ds-title">My Contacts</h6>
              <span class="nb-badge nb-badge-primary">{{ contacts().length }}</span>
            </div>
            @if (loadingContacts()) {
              <div class="text-center py-3"><div class="nb-spinner" style="margin:auto"></div></div>
            } @else if (contacts().length === 0) {
              <p class="text-muted-nb text-center py-3" style="font-size:.875rem">
                No contacts yet. <a routerLink="/browse">Find a provider →</a>
              </p>
            } @else {
              @for (c of contacts(); track $index) {
                <div class="bk-row">
                  <div class="bk-av" [style.background]="providerColor(c.providerId?.category)">
                    {{ (c.providerId?.businessName || 'P').charAt(0) }}
                  </div>
                  <div class="flex-grow-1">
                    <p class="bk-prov">{{ c.providerId?.businessName || 'Provider' }}</p>
                    <p class="bk-meta">
                      @if (c.channel === 'call') { <i class="bi bi-telephone-fill me-1"></i>Called }
                      @else { <i class="bi bi-whatsapp me-1"></i>WhatsApp }
                      · {{ c.createdAt | date:'dd MMM yyyy' }}
                    </p>
                  </div>
                  <a [routerLink]="['/provider', c.providerId?._id]" class="details-link">
                    View <i class="bi bi-chevron-right"></i>
                  </a>
                </div>
              }
            }
          </div>

          <!-- Saved Providers -->
          <div class="ds-card mt-4" data-testid="saved-section">
            <div class="ds-hdr">
              <h6 class="ds-title"><i class="bi bi-bookmark-fill me-1"></i>Saved Providers</h6>
              <span class="nb-badge nb-badge-primary">{{ saved().length }}</span>
            </div>
            @if (loadingSaved()) {
              <div class="text-center py-3"><div class="nb-spinner" style="margin:auto"></div></div>
            } @else if (saved().length === 0) {
              <p class="text-muted-nb text-center py-3" style="font-size:.875rem">
                Nothing saved yet. Tap the <i class="bi bi-bookmark"></i> on a provider to save it here.
              </p>
            } @else {
              @for (p of saved(); track p._id) {
                <div class="bk-row">
                  <div class="bk-av" [style.background]="providerColor(p.category)">
                    {{ (p.businessName || 'P').charAt(0) }}
                  </div>
                  <div class="flex-grow-1">
                    <p class="bk-prov">{{ p.businessName || 'Provider' }}</p>
                    <p class="bk-meta">
                      <i class="bi bi-star-fill me-1"></i>{{ p.ratingAvg }} · {{ p.ratingCount }} ratings
                    </p>
                  </div>
                  <a [routerLink]="['/provider', p._id]" class="details-link">
                    View <i class="bi bi-chevron-right"></i>
                  </a>
                  <button type="button" class="bk-unsave" title="Remove from saved" (click)="unsave(p._id)">
                    <i class="bi bi-x-lg"></i>
                  </button>
                </div>
              }
            }
          </div>
        </div>

        <!-- Right column -->
        <div class="col-md-4">

          <!-- Chats -->
          <div class="ds-card mb-3">
            <div class="ds-hdr"><h6 class="ds-title">Conversations</h6></div>
            <a routerLink="/chats" class="qa-full-item">
              <i class="bi bi-chat-dots-fill"></i>
              <span>Open My Chats</span>
              <i class="bi bi-chevron-right ms-auto"></i>
            </a>
            <button type="button" class="qa-full-item w-100" (click)="contactAdmin()">
              <i class="bi bi-headset"></i>
              <span>Contact Admin / Support</span>
              <i class="bi bi-chevron-right ms-auto"></i>
            </button>
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
    .details-link { font-size:.72rem; color:var(--nb-primary); text-decoration:none; font-weight:600; font-family:var(--font-display); }
    .details-link:hover { text-decoration:underline; }
    .bk-unsave { background:none; border:none; color:var(--nb-text-muted); cursor:pointer; padding:4px 6px; border-radius:6px; font-size:.8rem; transition:background .15s, color .15s; }
    .bk-unsave:hover { background:#FEE2E2; color:var(--nb-danger); }
    .qa-grid  { display:grid; grid-template-columns:1fr 1fr; gap:8px; }
    .qa-item  { display:flex; flex-direction:column; align-items:center; gap:6px; padding:14px; background:var(--nb-surface-2); border-radius:var(--radius-md); text-decoration:none; color:var(--nb-text); font-family:var(--font-display); font-size:.75rem; font-weight:600; text-transform:uppercase; letter-spacing:.04em; transition:all .2s; }
    .qa-item i { font-size:1.25rem; color:var(--nb-primary); }
    .qa-item:hover { background:#EFF6FF; color:var(--nb-primary); }
    .qa-full-item { display:flex; align-items:center; gap:10px; padding:12px; background:var(--nb-surface-2); border-radius:var(--radius-md); text-decoration:none; color:var(--nb-text); font-size:.875rem; font-weight:600; transition:background .15s; }
    .qa-full-item i { color:var(--nb-primary); }
    .qa-full-item:hover { background:#EFF6FF; }
    button.qa-full-item { border:none; cursor:pointer; font-family:inherit; text-align:left; margin-top:8px; }
  `]
})
export class CustomerDashboardComponent implements OnInit {
  contacts        = signal<ContactEntry[]>([]);
  loadingContacts = signal(true);
  kpis            = signal<any[]>([]);
  saved           = signal<any[]>([]);
  loadingSaved    = signal(true);

  constructor(
    public auth: AuthService,
    private api:  ApiService,
    private chat: ChatService,
    private toast: ToastService,
    private router: Router,
    private catSvc: CategoryService,
  ) { catSvc.load(); }

  firstName() { return this.auth.currentUser()?.name?.split(' ')[0] ?? ''; }

  // Open (or resume) a support chat with the platform admin.
  contactAdmin() {
    this.chat.openSupport().subscribe({
      next: c => this.router.navigate(['/chat', c._id]),
      error: () => this.toast.error('Could not reach support right now.'),
    });
  }

  ngOnInit() {
    this.loadSaved();
    this.api.get<ApiResponse<ContactEntry[]>>('/providers/my-contacts').subscribe({
      next: res => {
        const all = res.data ?? [];
        this.contacts.set(all);
        const calls = all.filter(c => c.channel === 'call').length;
        const wa    = all.filter(c => c.channel === 'whatsapp').length;
        this.kpis.set([
          { label:'Total Contacts', val: all.length, icon:'bi-telephone-fill',  bg:'#EFF6FF', ic:'#2563A8' },
          { label:'Calls Made',     val: calls,       icon:'bi-telephone',       bg:'#D1FAE5', ic:'#059669' },
          { label:'WhatsApp',       val: wa,          icon:'bi-whatsapp',        bg:'#FEF3C7', ic:'#D97706' },
          { label:'Providers',      val: new Set(all.map(c => c.providerId?._id)).size, icon:'bi-people-fill', bg:'#F3E8FF', ic:'#7C3AED' },
        ]);
        this.loadingContacts.set(false);
      },
      error: () => {
        this.loadingContacts.set(false);
        this.kpis.set([
          { label:'Total Contacts', val:0, icon:'bi-telephone-fill', bg:'#EFF6FF', ic:'#2563A8' },
          { label:'Calls Made',     val:0, icon:'bi-telephone',      bg:'#D1FAE5', ic:'#059669' },
          { label:'WhatsApp',       val:0, icon:'bi-whatsapp',       bg:'#FEF3C7', ic:'#D97706' },
          { label:'Providers',      val:0, icon:'bi-people-fill',    bg:'#F3E8FF', ic:'#7C3AED' },
        ]);
      },
    });
  }

  loadSaved() {
    this.loadingSaved.set(true);
    this.api.get<ApiResponse<any[]>>('/providers/saved').subscribe({
      next: res => { this.saved.set(res.data ?? []); this.loadingSaved.set(false); },
      error: () => { this.saved.set([]); this.loadingSaved.set(false); },
    });
  }

  unsave(providerId: string) {
    this.saved.update(list => list.filter(p => p._id !== providerId));   // optimistic
    this.api.delete<ApiResponse<any>>(`/providers/${providerId}/save`).subscribe({
      next: () => this.toast.success('Removed from saved.'),
      error: () => { this.toast.error('Could not remove. Refreshing…'); this.loadSaved(); },
    });
  }

  providerColor(cat: string) { return this.catSvc.color(cat); }
}
