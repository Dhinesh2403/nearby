// src/app/features/provider/provider-edit.component.ts
import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule }  from '@angular/forms';
import { RouterLink, Router } from '@angular/router';
import { ApiService, ApiResponse, Provider } from '../../core/services/api.service';
import { ToastService } from '../../core/services/toast.service';

@Component({
  selector: 'app-provider-edit',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  template: `
    <div class="container py-4" style="max-width:760px">
      <nav class="mb-3" style="font-size:.8rem;color:var(--nb-text-muted)">
        <a routerLink="/dashboard/provider" style="color:var(--nb-text-muted)">Dashboard</a>
        <span class="mx-2">›</span>
        <span style="color:var(--nb-text)">Service Details</span>
      </nav>

      <h2 class="section-title mb-1">{{ isNew() ? 'Create Your Service' : 'Edit Service Details' }}</h2>
      <p class="section-sub mb-4">
        {{ isNew() ? 'Set up your provider profile so customers can find and book you.'
                   : 'Update the information shown on your public profile.' }}
      </p>

      @if (loading()) {
        <div class="nb-spinner-wrap"><div class="nb-spinner"></div></div>
      } @else {
        <div class="form-card">

          <h6 class="fs-title">Business</h6>
          <div class="mb-3">
            <label class="nb-label">Business Name *</label>
            <input type="text" class="nb-input" [(ngModel)]="form.businessName" placeholder="e.g. Rajan Plumbing Works" />
          </div>
          <div class="mb-3">
            <label class="nb-label">Tagline</label>
            <input type="text" class="nb-input" [(ngModel)]="form.tagline" maxlength="120" placeholder="Trusted since 2015" />
          </div>
          <div class="mb-3">
            <label class="nb-label">Bio</label>
            <textarea class="nb-input" rows="3" [(ngModel)]="form.bio" maxlength="500"
                      placeholder="Describe your experience and what you offer..."></textarea>
          </div>

          <hr class="divider">

          <h6 class="fs-title">Category & Pricing</h6>
          <div class="row g-3 mb-3">
            <div class="col-sm-6">
              <label class="nb-label">Category *</label>
              <select class="nb-input" [(ngModel)]="form.category">
                @for (c of categories; track c.value) { <option [value]="c.value">{{ c.label }}</option> }
              </select>
            </div>
            <div class="col-sm-6">
              <label class="nb-label">Sub-Category</label>
              <input type="text" class="nb-input" [(ngModel)]="form.subCategory" placeholder="e.g. Plumber, Maths Tutor" />
            </div>
          </div>
          <div class="row g-3 mb-2">
            <div class="col-sm-4">
              <label class="nb-label">Price From (₹)</label>
              <input type="number" class="nb-input" [(ngModel)]="form.price" min="0" placeholder="200" />
            </div>
            <div class="col-sm-4">
              <label class="nb-label">Price To (₹)</label>
              <input type="number" class="nb-input" [(ngModel)]="form.priceMax" min="0" placeholder="2000" />
            </div>
            <div class="col-sm-4">
              <label class="nb-label">Experience (years)</label>
              <input type="number" class="nb-input" [(ngModel)]="form.experience" min="0" />
            </div>
          </div>
          <p class="text-muted-nb mb-3" style="font-size:.75rem">
            Set a range for varied work (e.g. different cakes). Leave "Price To" as 0 for a single price.
          </p>
          <div class="mb-3">
            <label class="nb-label">Service Tags <span class="text-muted-nb" style="font-weight:400">(press Enter or comma to add)</span></label>
            <div class="tag-input" (click)="tagBox.focus()">
              @for (s of form.skills; track s; let i = $index) {
                <span class="tag-chip">{{ s }}<button type="button" (click)="removeTag(i)"><i class="bi bi-x"></i></button></span>
              }
              <input #tagBox type="text" class="tag-field" [(ngModel)]="tagDraft"
                     [ngModelOptions]="{standalone:true}" placeholder="e.g. Pipe Fitting"
                     (keydown)="onTagKey($event)" (blur)="commitTag()" />
            </div>
          </div>
          <div class="mb-1">
            <label class="nb-check">
              <input type="checkbox" [(ngModel)]="form.isOnline" />
              <span>Available for online / remote sessions</span>
            </label>
          </div>

          <hr class="divider">

          <h6 class="fs-title">Work Photos <span class="text-muted-nb" style="font-weight:400;text-transform:none">(showcase your work)</span></h6>
          <div class="upload-zone mb-2" (click)="fi.click()">
            <input #fi type="file" hidden accept="image/*" multiple (change)="onPhotos($event)" />
            <i class="bi bi-images"></i>
            <p>Click to upload photos of your work</p>
            <span>JPG or PNG · Max 5 MB each</span>
          </div>
          @if (form.images.length > 0) {
            <div class="photo-grid mb-3">
              @for (img of form.images; track $index) {
                <div class="photo-thumb">
                  <img [src]="img" alt="work" />
                  <button type="button" class="photo-del" (click)="removePhoto($index)"><i class="bi bi-x"></i></button>
                </div>
              }
            </div>
          }

          <hr class="divider">

          <h6 class="fs-title">Availability</h6>
          <div class="days-wrap mb-3">
            @for (d of allDays; track d) {
              <button type="button" class="day-chip" [class.on]="form.availability.days.includes(d)"
                      (click)="toggleDay(d)">{{ d }}</button>
            }
          </div>
          <div class="row g-3 mb-3">
            <div class="col-sm-6">
              <label class="nb-label">Start Time</label>
              <input type="time" class="nb-input" [(ngModel)]="form.availability.startTime" />
            </div>
            <div class="col-sm-6">
              <label class="nb-label">End Time</label>
              <input type="time" class="nb-input" [(ngModel)]="form.availability.endTime" />
            </div>
          </div>

          @if (error()) {
            <div class="err-box"><i class="bi bi-exclamation-circle me-2"></i>{{ error() }}</div>
          }

          <button class="btn-nb-primary btn w-100 py-2" (click)="save()" [disabled]="saving()">
            @if (saving()) { <span class="spinner-border spinner-border-sm me-2"></span> }
            <i class="bi bi-check-circle me-2"></i>{{ isNew() ? 'Create Service Profile' : 'Save Changes' }}
          </button>

          @if (isNew()) {
            <p class="text-muted-nb text-center mt-2" style="font-size:.78rem">
              Your profile goes live in Browse as soon as you create it.
            </p>
          }
        </div>
      }
    </div>
  `,
  styles: [`
    .form-card { background:#fff;border:1px solid var(--nb-border);border-radius:var(--radius-lg);padding:1.5rem; }
    .fs-title  { font-family:var(--font-display);font-size:.75rem;font-weight:700;text-transform:uppercase;letter-spacing:.06em;color:var(--nb-text-muted);margin-bottom:.75rem; }
    .err-box   { background:#FEE2E2;color:#991b1b;border-radius:var(--radius-md);padding:10px 14px;font-size:.875rem;margin-bottom:12px; }
    textarea.nb-input { resize:vertical; }
    .tag-input { display:flex; flex-wrap:wrap; gap:6px; align-items:center; border:1.5px solid var(--nb-border); border-radius:var(--radius-md); padding:8px 10px; background:var(--nb-surface); cursor:text; min-height:46px; }
    .tag-input:focus-within { border-color:var(--nb-primary-light); box-shadow:0 0 0 3px rgba(37,99,168,.12); }
    .tag-chip { display:inline-flex; align-items:center; gap:5px; background:#EFF6FF; color:var(--nb-primary); border-radius:6px; padding:4px 8px; font-size:.8rem; font-weight:600; font-family:var(--font-display); }
    .tag-chip button { background:none; border:none; color:var(--nb-primary); cursor:pointer; padding:0; display:flex; line-height:1; }
    .tag-field { border:none; outline:none; background:transparent; font-family:var(--font-body); font-size:.875rem; flex:1; min-width:120px; padding:4px 0; }
    .nb-check  { display:flex;align-items:center;gap:8px;font-size:.875rem;cursor:pointer; }
    .nb-check input { width:16px;height:16px; }
    .days-wrap { display:flex;flex-wrap:wrap;gap:8px; }
    .day-chip  { padding:8px 14px;border-radius:var(--radius-sm);border:1.5px solid var(--nb-border);background:var(--nb-bg);font-family:var(--font-display);font-size:.8rem;font-weight:600;cursor:pointer;transition:all .15s; }
    .day-chip.on { background:var(--nb-primary);border-color:var(--nb-primary);color:#fff; }
    .upload-zone { border:2px dashed var(--nb-border);border-radius:var(--radius-md);padding:1.5rem;text-align:center;cursor:pointer;transition:all .2s; }
    .upload-zone:hover { border-color:var(--nb-primary);background:#EFF6FF; }
    .upload-zone i { font-size:1.8rem;color:var(--nb-text-muted);display:block;margin-bottom:.4rem; }
    .upload-zone p { margin:0 0 2px;font-weight:600;font-size:.85rem; }
    .upload-zone span { font-size:.72rem;color:var(--nb-text-muted); }
    .photo-grid { display:flex;flex-wrap:wrap;gap:10px; }
    .photo-thumb { position:relative;width:96px;height:96px;border-radius:var(--radius-md);overflow:hidden;border:1px solid var(--nb-border); }
    .photo-thumb img { width:100%;height:100%;object-fit:cover; }
    .photo-del { position:absolute;top:3px;right:3px;width:22px;height:22px;border:none;border-radius:50%;background:rgba(0,0,0,.6);color:#fff;font-size:.75rem;display:flex;align-items:center;justify-content:center;cursor:pointer; }
  `]
})
export class ProviderEditComponent implements OnInit {
  providerId = '';
  isNew   = signal(false);
  loading = signal(true);
  saving  = signal(false);
  error   = signal('');

  tagDraft   = '';
  allDays    = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];
  categories = [
    { value: 'home_services', label: 'Home Services' },
    { value: 'education',     label: 'Education' },
    { value: 'food',          label: 'Food & Essentials' },
    { value: 'wellness',      label: 'Wellness' },
    { value: 'events',        label: 'Events' },
  ];

  form = {
    businessName: '', tagline: '', bio: '',
    category: 'home_services', subCategory: '',
    skills: [] as string[], experience: 0, price: 0, priceMax: 0, isOnline: false,
    images: [] as string[],
    availability: { days: ['Mon','Tue','Wed','Thu','Fri'] as string[], startTime: '09:00', endTime: '18:00' },
  };

  constructor(private api: ApiService, private toast: ToastService, private router: Router) {}

  ngOnInit() {
    this.api.get<ApiResponse<Provider>>('/providers/my').subscribe({
      next: res => {
        const p = res.data;
        this.providerId = p._id;
        this.form.businessName = p.businessName ?? '';
        this.form.tagline      = p.tagline ?? '';
        this.form.bio          = p.bio ?? '';
        this.form.category     = p.category ?? 'home_services';
        this.form.subCategory  = p.subCategory ?? '';
        this.form.skills       = p.skills ?? [];
        this.form.experience   = p.experience ?? 0;
        this.form.price        = p.price ?? 0;
        this.form.priceMax     = p.priceMax ?? 0;
        this.form.images       = p.images ?? [];
        this.form.isOnline      = p.isOnline ?? false;
        this.form.availability = {
          days:      p.availability?.days ?? ['Mon','Tue','Wed','Thu','Fri'],
          startTime: p.availability?.startTime ?? '09:00',
          endTime:   p.availability?.endTime ?? '18:00',
        };
        this.isNew.set(false);
        this.loading.set(false);
      },
      error: () => {
        // No profile yet → create mode
        this.isNew.set(true);
        this.loading.set(false);
      },
    });
  }

  toggleDay(d: string) {
    const days = this.form.availability.days;
    this.form.availability.days = days.includes(d) ? days.filter(x => x !== d) : [...days, d];
  }

  onPhotos(e: Event) {
    const el = e.target as HTMLInputElement;
    if (!el.files) return;
    Array.from(el.files).forEach(f => {
      if (f.size > 5 * 1024 * 1024) { this.toast.error(`${f.name} is over 5 MB.`); return; }
      if (!f.type.startsWith('image/')) return;
      const reader = new FileReader();
      reader.onload = () => this.form.images = [...this.form.images, reader.result as string];
      reader.readAsDataURL(f);
    });
    el.value = '';
  }

  removePhoto(i: number) {
    this.form.images = this.form.images.filter((_, idx) => idx !== i);
  }

  // ── Service-tag chip input (11.38) ───────────────────────────
  onTagKey(e: KeyboardEvent) {
    if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); this.commitTag(); }
    else if (e.key === 'Backspace' && !this.tagDraft && this.form.skills.length) {
      this.form.skills = this.form.skills.slice(0, -1);
    }
  }
  commitTag() {
    const t = this.tagDraft.trim().replace(/,$/, '').trim();
    if (t && !this.form.skills.some(s => s.toLowerCase() === t.toLowerCase())) {
      this.form.skills = [...this.form.skills, t];
    }
    this.tagDraft = '';
  }
  removeTag(i: number) { this.form.skills = this.form.skills.filter((_, idx) => idx !== i); }

  save() {
    this.commitTag();   // fold any half-typed tag into the list
    this.error.set('');
    if (!this.form.businessName.trim()) { this.error.set('Business name is required.'); return; }
    if (!this.form.category)            { this.error.set('Please choose a category.'); return; }

    this.saving.set(true);
    const done = (msg: string) => { this.saving.set(false); this.toast.success(msg); };
    const failHandler = (m: string) => { this.saving.set(false); this.error.set(m || 'Save failed.'); };

    if (this.isNew()) {
      this.api.post<ApiResponse<Provider>>('/providers', this.form).subscribe({
        next: res => { done('Service profile created.'); this.providerId = res.data._id; this.isNew.set(false); },
        error: err => failHandler(err.error?.message),
      });
    } else {
      this.api.put<ApiResponse<Provider>>(`/providers/${this.providerId}`, this.form).subscribe({
        next: () => done('Service details updated.'),
        error: err => failHandler(err.error?.message),
      });
    }
  }
}
