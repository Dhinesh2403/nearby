// src/app/features/complaints/complaint-form.component.ts
import { Component, OnInit, signal } from '@angular/core';
import { CommonModule }  from '@angular/common';
import { FormsModule }   from '@angular/forms';
import { RouterLink, ActivatedRoute } from '@angular/router';
import { ApiService, ApiResponse } from '../../core/services/api.service';
import { AuthService }   from '../../core/auth/auth.service';
import { ToastService }  from '../../core/services/toast.service';
import { UploadService } from '../../core/services/upload.service';
import { SettingsService } from '../../core/services/settings.service';

@Component({
  selector: 'app-complaint-form',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  template: `
    <div class="container py-4" style="max-width:640px">
      <h2 class="section-title mb-1">Raise a Complaint</h2>
      <p class="section-sub mb-4">We respond within 24 hours</p>

      @if (submitted()) {
        <div class="success-card">
          <div class="success-icon"><i class="bi bi-shield-check-fill"></i></div>
          <h4>Complaint Submitted</h4>
          <p>Our team will review and respond within 24 hours.</p>
          <div class="success-actions">
            <div class="ref-box">Reference: <strong>#COMP-{{ refId }}</strong></div>
            <a routerLink="/dashboard/customer" class="btn-nb-primary btn">Back to Dashboard</a>
          </div>
        </div>
      } @else if (complaintsClosed()) {
        <div class="info-note">
          <i class="bi bi-info-circle-fill"></i>
          <p>Complaint submissions are currently disabled. Please try again later or contact support directly.</p>
        </div>
      } @else {
        <div class="form-card">

          <!-- Provider being reported (from profile page ?against= or manual entry) -->
          <div class="mb-3">
            <label class="nb-label">Reporting</label>
            @if (directAgainst()) {
              <div class="report-target">
                <i class="bi bi-person-badge-fill"></i>
                <span>{{ targetName() || 'This provider' }}</span>
              </div>
            } @else {
              <div class="info-note mb-0">
                <i class="bi bi-info-circle-fill"></i>
                <p>To report a provider, open their profile and tap the <strong>Report</strong> flag icon.</p>
              </div>
            }
          </div>

          <div class="mb-3">
            <label class="nb-label">Complaint Type</label>
            <div class="type-grid">
              @for (t of types; track t.id) {
                <button class="type-btn" [class.active]="form.type===t.id" (click)="form.type=t.id">
                  <i class="bi" [class]="t.icon"></i><span>{{ t.label }}</span>
                </button>
              }
            </div>
          </div>

          <div class="mb-3">
            <label class="nb-label">Description</label>
            <textarea class="nb-input" rows="5" [(ngModel)]="form.description"
                      placeholder="Describe what happened in detail. The more info you provide, the faster we can resolve it."></textarea>
            <p style="font-size:.72rem;color:var(--nb-text-muted);margin-top:4px">{{ form.description.length }}/1000</p>
          </div>

          <div class="mb-4">
            <label class="nb-label">Upload Evidence (optional)</label>
            <div class="upload-zone" (click)="!uploading() && fi.click()">
              <input #fi type="file" hidden accept="image/*" multiple
                     (change)="onFile($event)" data-testid="evidence-upload" />
              @if (uploading()) {
                <div class="nb-spinner" style="width:28px;height:28px;margin:0 auto .5rem"></div>
                <p>Uploading to Cloudinary…</p>
              } @else {
                <i class="bi bi-cloud-upload"></i>
                <p>Click to upload photos</p>
                <span>JPG or PNG · Max 5 MB</span>
              }
            </div>
            @if (evidence().length>0) {
              <div class="ev-grid">
                @for (e of evidence(); track $index) {
                  <div class="ev-thumb">
                    <img [src]="e" alt="evidence" />
                    <button type="button" class="ev-del" (click)="removeEvidence($index)">
                      <i class="bi bi-x"></i>
                    </button>
                  </div>
                }
              </div>
            }
          </div>

          @if (error()) {
            <div class="err-box"><i class="bi bi-exclamation-circle me-2"></i>{{ error() }}</div>
          }

          <div class="info-note">
            <i class="bi bi-info-circle-fill"></i>
            <p>Both parties will be contacted. False complaints may lead to account suspension.</p>
          </div>

          <button class="btn-nb-primary btn w-100 py-2 mt-3"
                  (click)="submit()" [disabled]="loading()">
            @if (loading()) { <span class="spinner-border spinner-border-sm me-2"></span> }
            <i class="bi bi-send me-2"></i>Submit Complaint
          </button>
        </div>
      }
    </div>
  `,
  styles: [`
    .form-card { background:#fff;border:1px solid var(--nb-border);border-radius:var(--radius-xl);padding:2rem; }
    .type-grid { display:grid;grid-template-columns:repeat(auto-fill,minmax(120px,1fr));gap:8px; }
    .type-btn  { display:flex;flex-direction:column;align-items:center;gap:6px;padding:14px 10px;border:1.5px solid var(--nb-border);border-radius:var(--radius-md);background:var(--nb-bg);font-family:var(--font-display);font-size:.72rem;font-weight:700;text-transform:uppercase;letter-spacing:.04em;color:var(--nb-text-muted);cursor:pointer;transition:all .2s; }
    .type-btn i { font-size:1.25rem; }
    .type-btn.active { border-color:var(--nb-danger);background:#FEF2F2;color:var(--nb-danger); }
    textarea.nb-input { resize:vertical; }
    .upload-zone { border:2px dashed var(--nb-border);border-radius:var(--radius-md);padding:2rem;text-align:center;cursor:pointer;transition:all .2s; }
    .upload-zone:hover { border-color:var(--nb-primary);background:#EFF6FF; }
    .upload-zone i { font-size:2rem;color:var(--nb-text-muted);display:block;margin-bottom:.5rem; }
    .upload-zone p { margin:0 0 4px;font-weight:600;font-size:.9rem; }
    .upload-zone span { font-size:.75rem;color:var(--nb-text-muted); }
    .ev-grid { display:flex;flex-wrap:wrap;gap:10px;margin-top:12px; }
    .ev-thumb { position:relative;width:80px;height:80px;border-radius:var(--radius-md);overflow:hidden;border:1px solid var(--nb-border); }
    .ev-thumb img { width:100%;height:100%;object-fit:cover; }
    .ev-del { position:absolute;top:2px;right:2px;width:20px;height:20px;border:none;border-radius:50%;background:rgba(0,0,0,.6);color:#fff;font-size:.7rem;display:flex;align-items:center;justify-content:center;cursor:pointer; }
    .err-box { background:#FEE2E2;color:#991b1b;border-radius:var(--radius-md);padding:10px 14px;font-size:.875rem;margin-bottom:12px; }
    .report-target { display:flex;align-items:center;gap:10px;background:#FEF2F2;border:1.5px solid #FECACA;border-radius:var(--radius-md);padding:12px 14px;font-weight:600; }
    .report-target i { color:var(--nb-danger);font-size:1.2rem; }
    .info-note { display:flex;gap:10px;align-items:flex-start;background:#FEF3C7;border-radius:var(--radius-md);padding:12px; }
    .info-note i { color:var(--nb-warning);margin-top:2px; }
    .info-note p { margin:0;font-size:.8rem;color:var(--nb-text-muted); }
    .success-card { text-align:center;padding:3rem 2rem;background:#fff;border:1px solid var(--nb-border);border-radius:var(--radius-xl); }
    .success-icon { font-size:3.5rem;color:var(--nb-primary);margin-bottom:1rem; }
    .success-card h4 { font-size:1.4rem;font-weight:800;margin-bottom:.5rem; }
    .ref-box { background:var(--nb-surface-2);border-radius:var(--radius-md);padding:10px 20px;font-size:.875rem;color:var(--nb-text-muted); }
    .success-actions { display:flex;flex-wrap:wrap;justify-content:center;align-items:center;gap:.75rem;margin-top:1.5rem; }
  `]
})
export class ComplaintFormComponent implements OnInit {
  form = { type:'', description:'' };
  evidence  = signal<string[]>([]);
  loading   = signal(false);
  uploading = signal(false);
  error     = signal('');
  submitted = signal(false);
  refId     = Math.floor(Math.random()*90000+10000);
  directAgainst = signal('');           // provider userId when reporting from profile
  targetName    = signal('');

  types = [
    { id:'no_show',   label:'No Show',      icon:'bi-calendar-x' },
    { id:'quality',   label:'Poor Quality', icon:'bi-hand-thumbs-down' },
    { id:'fraud',     label:'Fraud',        icon:'bi-shield-exclamation' },
    { id:'behaviour', label:'Behaviour',    icon:'bi-emoji-frown' },
    { id:'other',     label:'Other',        icon:'bi-three-dots' },
  ];

  constructor(
    private api: ApiService,
    private auth: AuthService,
    private toast: ToastService,
    private route: ActivatedRoute,
    private uploadSvc: UploadService,
    private settings: SettingsService,
  ) {}

  // Admin can disable complaint submissions (5.12). Defaults to open until
  // settings load so the form isn't wrongly hidden while the fetch is in flight.
  complaintsClosed(): boolean {
    return this.settings.settings()?.complaintsEnabled === false;
  }

  ngOnInit() {
    // Report from a provider profile: ?against=<userId>&name=<businessName>
    const qp = this.route.snapshot.queryParamMap;
    if (qp.get('against')) {
      this.directAgainst.set(qp.get('against')!);
      this.targetName.set(qp.get('name') ?? '');
    }
  }

  onFile(e: Event) {
    const el = e.target as HTMLInputElement;
    if (!el.files) return;
    const files = Array.from(el.files).filter(f => {
      if (f.size > 5 * 1024 * 1024) { this.toast.error(`${f.name} is over 5 MB.`); return false; }
      if (!f.type.startsWith('image/')) { this.toast.error('Only image files are supported.'); return false; }
      return true;
    });
    el.value = '';
    if (!files.length) return;
    this.uploading.set(true);
    this.uploadSvc.uploadImages(files, 'Nearby/complaints').subscribe({
      next: results => {
        this.evidence.update(list => [...list, ...results.map(r => r.url)]);
        this.uploading.set(false);
      },
      error: () => {
        this.toast.error('Evidence upload failed. Please try again.');
        this.uploading.set(false);
      },
    });
  }

  removeEvidence(i: number) {
    this.evidence.update(list => list.filter((_, idx) => idx !== i));
  }

  submit() {
    this.error.set('');
    const against = this.directAgainst();
    if (!against) { this.error.set('Please open a provider profile and use the Report button.'); return; }
    if (!this.form.type) { this.error.set('Please select a complaint type.'); return; }
    if (this.form.description.trim().length < 20) { this.error.set('Please describe in at least 20 characters.'); return; }

    this.loading.set(true);
    this.api.post<any>('/complaints', {
      type:        this.form.type,
      description: this.form.description,
      against,
      evidence:    this.evidence(),
    }).subscribe({
      next: () => { this.loading.set(false); this.submitted.set(true); },
      error: (err) => {
        this.loading.set(false);
        this.error.set(err.error?.message ?? 'Could not submit complaint. Please try again.');
      },
    });
  }
}
