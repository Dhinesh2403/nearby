// src/app/core/services/dialog.service.ts
// App-wide modal dialogs (confirm / prompt) — a drop-in replacement for the
// native window.confirm()/prompt()/alert(). Inject anywhere and await the result.
import { Injectable, signal } from '@angular/core';

export interface DialogConfig {
  title?:       string;
  message:      string;
  confirmText?: string;
  cancelText?:  string;
  danger?:      boolean;
  // prompt-only
  prompt?:      boolean;
  placeholder?: string;
  value?:       string;
  required?:    boolean;
  multiline?:   boolean;
}

interface ActiveDialog extends DialogConfig {
  resolve: (v: string | boolean | null) => void;
}

@Injectable({ providedIn: 'root' })
export class DialogService {
  readonly active = signal<ActiveDialog | null>(null);

  /** Yes/No confirmation. Resolves true if confirmed, false otherwise. */
  confirm(message: string, opts: Partial<DialogConfig> = {}): Promise<boolean> {
    return new Promise(resolve => {
      this.active.set({
        message, confirmText: 'Confirm', cancelText: 'Cancel', ...opts,
        prompt: false,
        resolve: v => resolve(v === true),
      });
    });
  }

  /** Text input. Resolves the entered string, or null if cancelled. */
  prompt(message: string, opts: Partial<DialogConfig> = {}): Promise<string | null> {
    return new Promise(resolve => {
      this.active.set({
        message, confirmText: 'Save', cancelText: 'Cancel', value: '', ...opts,
        prompt: true,
        resolve: v => resolve(typeof v === 'string' ? v : null),
      });
    });
  }

  /** Simple acknowledgement (replacement for alert). */
  alert(message: string, opts: Partial<DialogConfig> = {}): Promise<boolean> {
    return this.confirm(message, { confirmText: 'OK', cancelText: '', ...opts });
  }

  /** Called by the host component to settle and dismiss the dialog. */
  close(result: string | boolean | null) {
    const d = this.active();
    if (d) { d.resolve(result); this.active.set(null); }
  }
}
