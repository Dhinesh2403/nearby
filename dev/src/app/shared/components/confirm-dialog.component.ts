// src/app/shared/components/confirm-dialog.component.ts
// Single global host for app-wide modal dialogs. Rendered once in AppComponent;
// driven entirely by DialogService. Replaces native confirm/prompt/alert.
import { Component, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule }  from '@angular/forms';
import { DialogService } from '../../core/services/dialog.service';

@Component({
  selector: 'app-confirm-dialog',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    @if (dialog.active(); as d) {
      <div class="nb-dlg-backdrop" (click)="cancel()">
        <div class="nb-dlg" (click)="$event.stopPropagation()" role="dialog" aria-modal="true">
          @if (d.title) { <h3 class="nb-dlg-title">{{ d.title }}</h3> }
          <p class="nb-dlg-msg">{{ d.message }}</p>

          @if (d.prompt) {
            @if (d.multiline) {
              <textarea class="nb-dlg-input" rows="3" [(ngModel)]="input"
                        [placeholder]="d.placeholder || ''"></textarea>
            } @else {
              <input #fld type="text" class="nb-dlg-input" [(ngModel)]="input"
                     [placeholder]="d.placeholder || ''" (keyup.enter)="confirm()" />
            }
          }

          <div class="nb-dlg-actions">
            @if (d.cancelText) {
              <button type="button" class="nb-dlg-btn cancel" (click)="cancel()">{{ d.cancelText }}</button>
            }
            <button type="button" class="nb-dlg-btn confirm" [class.danger]="d.danger"
                    [disabled]="!!d.prompt && !!d.required && !input.trim()" (click)="confirm()">
              {{ d.confirmText }}
            </button>
          </div>
        </div>
      </div>
    }
  `,
  styles: [`
    .nb-dlg-backdrop { position:fixed; inset:0; background:rgba(15,23,42,.55); z-index:11000;
      display:flex; align-items:center; justify-content:center; padding:1.25rem; animation:dlgFade .15s ease; }
    .nb-dlg { background:#fff; border-radius:var(--radius-lg); box-shadow:0 24px 60px rgba(0,0,0,.25);
      width:100%; max-width:420px; padding:1.5rem; animation:dlgPop .18s cubic-bezier(.4,0,.2,1); }
    .nb-dlg-title { font-family:var(--font-display); font-weight:800; font-size:1.15rem; margin:0 0 .5rem; color:var(--nb-text); }
    .nb-dlg-msg { font-size:.92rem; line-height:1.55; color:var(--nb-text-muted); margin:0 0 1rem; }
    .nb-dlg-input { width:100%; border:1.5px solid var(--nb-border); border-radius:var(--radius-md);
      padding:10px 12px; font-family:var(--font-body); font-size:.9rem; outline:none; margin-bottom:1rem; resize:vertical; }
    .nb-dlg-input:focus { border-color:var(--nb-primary); }
    .nb-dlg-actions { display:flex; justify-content:flex-end; gap:10px; }
    .nb-dlg-btn { border:none; border-radius:var(--radius-md); padding:9px 18px; font-family:var(--font-display);
      font-weight:700; font-size:.85rem; cursor:pointer; transition:all .15s; }
    .nb-dlg-btn.cancel { background:var(--nb-surface-2); color:var(--nb-text); }
    .nb-dlg-btn.cancel:hover { background:var(--nb-border); }
    .nb-dlg-btn.confirm { background:var(--nb-primary); color:#fff; }
    .nb-dlg-btn.confirm:hover:not(:disabled) { background:var(--nb-primary-light); }
    .nb-dlg-btn.confirm.danger { background:var(--nb-danger); }
    .nb-dlg-btn.confirm.danger:hover:not(:disabled) { filter:brightness(.92); }
    .nb-dlg-btn:disabled { opacity:.5; cursor:not-allowed; }
    @keyframes dlgFade { from { opacity:0; } to { opacity:1; } }
    @keyframes dlgPop { from { opacity:0; transform:translateY(12px) scale(.97); } to { opacity:1; transform:none; } }
  `]
})
export class ConfirmDialogComponent {
  input = '';

  constructor(public dialog: DialogService) {
    // Seed the input each time a new prompt opens.
    effect(() => { this.input = this.dialog.active()?.value ?? ''; });
  }

  confirm() {
    const d = this.dialog.active();
    if (!d) return;
    if (d.prompt) {
      if (d.required && !this.input.trim()) return;
      this.dialog.close(this.input);
    } else {
      this.dialog.close(true);
    }
  }

  cancel() { this.dialog.close(null); }
}
