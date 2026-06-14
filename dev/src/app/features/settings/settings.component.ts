// src/app/features/settings/settings.component.ts
import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule }  from '@angular/forms';
import { AuthService }  from '../../core/auth/auth.service';
import { ToastService } from '../../core/services/toast.service';
import { DISTRICTS }    from '../../core/constants';

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="container py-4" style="max-width:680px">
      <h2 class="section-title mb-1">Account Settings</h2>
      <p class="section-sub mb-4">Update your personal details and password</p>

      @if (loading()) {
        <div class="nb-spinner-wrap"><div class="nb-spinner"></div></div>
      } @else {
        <div class="form-card">

          <!-- Profile -->
          <h6 class="fs-title">Profile</h6>

          <div class="mb-3">
            <label class="nb-label">Full Name</label>
            <input type="text" class="nb-input" [(ngModel)]="form.name" placeholder="Your name" />
          </div>

          <div class="mb-3">
            <label class="nb-label">Email</label>
            <input type="email" class="nb-input" [value]="email" disabled />
            <small class="text-muted-nb">Email can't be changed.</small>
          </div>

          <div class="row g-3 mb-3">
            <div class="col-sm-6">
              <label class="nb-label">Mobile Number</label>
              <input type="tel" class="nb-input" [(ngModel)]="form.phone"
                     placeholder="9876543210" maxlength="15" />
            </div>
            <div class="col-sm-6">
              <label class="nb-label">District</label>
              <select class="nb-input" [(ngModel)]="form.district">
                <option value="" disabled>Select district</option>
                @for (d of districts; track d) { <option [value]="d">{{ d }}</option> }
              </select>
            </div>
          </div>

          <div class="row g-3 mb-3">
            <div class="col-sm-6">
              <label class="nb-label">Area / Location</label>
              <input type="text" class="nb-input" [(ngModel)]="form.area" placeholder="e.g. Anna Nagar" />
            </div>
            <div class="col-sm-6">
              <label class="nb-label">City</label>
              <input type="text" class="nb-input" [(ngModel)]="form.city" placeholder="Chennai" />
            </div>
          </div>

          <div class="mb-3">
            <label class="nb-label">Address</label>
            <input type="text" class="nb-input" [(ngModel)]="form.address"
                   placeholder="Door no, street" />
          </div>

          <hr class="divider">

          <!-- Password -->
          <h6 class="fs-title">Change Password <span class="text-muted-nb" style="font-weight:400;text-transform:none">(optional)</span></h6>
          <div class="mb-3">
            <label class="nb-label">New Password</label>
            <input type="password" class="nb-input" [(ngModel)]="form.password"
                   placeholder="Leave blank to keep current password" autocomplete="new-password" />
          </div>

          @if (error()) {
            <div class="err-box"><i class="bi bi-exclamation-circle me-2"></i>{{ error() }}</div>
          }

          <button class="btn-nb-primary btn w-100 py-2" (click)="save()" [disabled]="saving()">
            @if (saving()) { <span class="spinner-border spinner-border-sm me-2"></span> }
            <i class="bi bi-check-circle me-2"></i>Save Changes
          </button>
        </div>
      }
    </div>
  `,
  styles: [`
    .form-card { background:#fff;border:1px solid var(--nb-border);border-radius:var(--radius-lg);padding:1.5rem; }
    .fs-title  { font-family:var(--font-display);font-size:.75rem;font-weight:700;text-transform:uppercase;letter-spacing:.06em;color:var(--nb-text-muted);margin-bottom:.75rem; }
    .err-box   { background:#FEE2E2;color:#991b1b;border-radius:var(--radius-md);padding:10px 14px;font-size:.875rem;margin-bottom:12px; }
  `]
})
export class SettingsComponent implements OnInit {
  form = { name: '', phone: '', city: '', address: '', district: '', area: '', password: '' };
  districts = DISTRICTS;
  email = '';
  loading = signal(true);
  saving  = signal(false);
  error   = signal('');

  constructor(private auth: AuthService, private toast: ToastService) {}

  ngOnInit() {
    this.auth.loadProfile().subscribe({
      next: res => {
        const u = res.data;
        this.email        = u.email ?? '';
        this.form.name     = u.name ?? '';
        this.form.phone    = u.phone ?? '';
        this.form.city     = u.location?.city ?? '';
        this.form.address  = u.location?.address ?? '';
        this.form.district = u.location?.district ?? '';
        this.form.area     = u.location?.area ?? '';
        this.loading.set(false);
      },
      error: () => { this.loading.set(false); this.error.set('Could not load your profile.'); },
    });
  }

  save() {
    this.error.set('');
    if (!this.form.name.trim())  { this.error.set('Name is required.'); return; }
    if (!this.form.phone.trim()) { this.error.set('Mobile number is required.'); return; }

    const payload: any = {
      name:     this.form.name.trim(),
      phone:    this.form.phone.trim(),
      city:     this.form.city.trim(),
      address:  this.form.address.trim(),
      district: this.form.district,
      area:     this.form.area.trim(),
    };
    if (this.form.password) payload.password = this.form.password;

    this.saving.set(true);
    this.auth.updateProfile(payload).subscribe({
      next: () => {
        this.saving.set(false);
        this.form.password = '';
        this.toast.success('Profile updated.');
      },
      error: (msg: string) => { this.saving.set(false); this.error.set(msg); },
    });
  }
}
