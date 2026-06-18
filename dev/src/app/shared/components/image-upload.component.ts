// src/app/shared/components/image-upload.component.ts
// Drag-and-drop / click-to-upload image picker backed by Cloudinary.
// Emits the CDN URL(s) so the parent can save them.
import { Component, signal, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { UploadService } from '../../core/services/upload.service';

@Component({
  selector: 'app-image-upload',
  standalone: true,
  imports: [CommonModule],
  template: `
    <!-- Drop zone -->
    <div class="iu-zone"
         [class.iu-zone--drag]="dragging()"
         [class.iu-zone--busy]="uploading()"
         (dragover)="$event.preventDefault(); dragging.set(true)"
         (dragleave)="dragging.set(false)"
         (drop)="onDrop($event)"
         (click)="fileInput.click()">

      @if (uploading()) {
        <div class="iu-spinner"><span></span></div>
        <p class="iu-hint">Uploading…</p>
      } @else if (previewUrls().length) {
        <div class="iu-thumbs">
          @for (url of previewUrls(); track url; let i = $index) {
            <div class="iu-thumb">
              <img [src]="url" alt="Preview" />
              <button class="iu-rm" (click)="$event.stopPropagation(); removeAt(i)" title="Remove">
                <i class="bi bi-x-lg"></i>
              </button>
            </div>
          }
          @if (multiple() && previewUrls().length < maxImages()) {
            <div class="iu-add"><i class="bi bi-plus-lg"></i></div>
          }
        </div>
      } @else {
        <i class="bi bi-cloud-arrow-up iu-icon"></i>
        <p class="iu-hint">
          <strong>Click to upload</strong> or drag & drop<br>
          <small>JPG, PNG or WebP · Max {{ maxSizeMb() }} MB</small>
        </p>
      }
    </div>

    @if (error()) { <p class="iu-err"><i class="bi bi-exclamation-circle me-1"></i>{{ error() }}</p> }

    <!-- Hidden native file input -->
    <input #fileInput type="file"
           [accept]="'image/jpeg,image/png,image/webp'"
           [multiple]="multiple()"
           style="display:none"
           (change)="onFileChange($event)" />
  `,
  styles: [`
    .iu-zone { border:2px dashed var(--nb-border); border-radius:var(--radius-md); padding:1.5rem; text-align:center; cursor:pointer; transition:border-color .2s, background .2s; background:var(--nb-surface-2); }
    .iu-zone:hover, .iu-zone--drag { border-color:var(--nb-primary); background:#EFF6FF; }
    .iu-zone--busy { pointer-events:none; opacity:.7; }
    .iu-icon { font-size:2.5rem; color:var(--nb-text-muted); }
    .iu-hint { margin:.5rem 0 0; color:var(--nb-text-muted); font-size:.85rem; }
    .iu-hint strong { color:var(--nb-primary); }
    .iu-thumbs { display:flex; flex-wrap:wrap; gap:10px; justify-content:center; }
    .iu-thumb { position:relative; width:96px; height:96px; border-radius:var(--radius-md); overflow:hidden; }
    .iu-thumb img { width:100%; height:100%; object-fit:cover; }
    .iu-rm { position:absolute; top:4px; right:4px; background:rgba(0,0,0,.6); border:none; color:#fff; width:22px; height:22px; border-radius:50%; display:flex; align-items:center; justify-content:center; font-size:.65rem; cursor:pointer; }
    .iu-add { width:96px; height:96px; border:2px dashed var(--nb-border); border-radius:var(--radius-md); display:flex; align-items:center; justify-content:center; color:var(--nb-text-muted); font-size:1.5rem; }
    .iu-spinner { display:inline-block; width:40px; height:40px; border:3px solid var(--nb-border); border-top-color:var(--nb-primary); border-radius:50%; animation:iu-spin .7s linear infinite; margin-bottom:.5rem; }
    @keyframes iu-spin { to { transform:rotate(360deg); } }
    .iu-err { color:var(--nb-danger); font-size:.8rem; margin:.4rem 0 0; }
  `],
})
export class ImageUploadComponent {
  /** 'avatar' | 'provider' | 'banner' — controls crop preset */
  type      = input<'avatar' | 'provider' | 'banner'>('provider');
  /** Allow picking multiple images */
  multiple  = input(false);
  /** Max images when multiple=true */
  maxImages = input(5);
  /** Max file size shown in hint text */
  maxSizeMb = input(5);
  /** Cloudinary folder */
  folder    = input('nearby/providers');

  /** Emits a single URL (when multiple=false) */
  uploaded  = output<string>();
  /** Emits array of URLs (when multiple=true) */
  uploadedMany = output<string[]>();

  dragging   = signal(false);
  uploading  = signal(false);
  error      = signal<string | null>(null);
  previewUrls = signal<string[]>([]);

  private publicIds: string[] = [];

  constructor(private uploader: UploadService) {}

  onDrop(e: DragEvent) {
    e.preventDefault();
    this.dragging.set(false);
    const files = Array.from(e.dataTransfer?.files ?? []).filter(f => f.type.startsWith('image/'));
    if (files.length) this.process(files);
  }

  onFileChange(e: Event) {
    const files = Array.from((e.target as HTMLInputElement).files ?? []);
    if (files.length) this.process(files);
    // Reset so same file can be re-selected
    (e.target as HTMLInputElement).value = '';
  }

  private process(files: File[]) {
    this.error.set(null);
    const toUpload = this.multiple()
      ? files.slice(0, this.maxImages() - this.previewUrls().length)
      : [files[0]];

    if (!toUpload.length) return;

    this.uploading.set(true);

    if (this.multiple() && toUpload.length > 1) {
      this.uploader.uploadImages(toUpload, this.folder()).subscribe({
        next: results => {
          const urls = results.map(r => r.url);
          this.publicIds.push(...results.map(r => r.publicId));
          this.previewUrls.update(p => [...p, ...urls]);
          this.uploadedMany.emit([...this.previewUrls()]);
          this.uploading.set(false);
        },
        error: (msg: string) => { this.error.set(msg); this.uploading.set(false); },
      });
    } else {
      this.uploader.uploadImage(toUpload[0], this.type(), this.folder()).subscribe({
        next: result => {
          this.publicIds.push(result.publicId);
          if (this.multiple()) {
            this.previewUrls.update(p => [...p, result.url]);
            this.uploadedMany.emit([...this.previewUrls()]);
          } else {
            this.previewUrls.set([result.url]);
            this.uploaded.emit(result.url);
          }
          this.uploading.set(false);
        },
        error: (msg: string) => { this.error.set(msg); this.uploading.set(false); },
      });
    }
  }

  removeAt(i: number) {
    this.previewUrls.update(p => p.filter((_, idx) => idx !== i));
    this.publicIds.splice(i, 1);
    if (this.multiple()) this.uploadedMany.emit([...this.previewUrls()]);
    else { this.uploaded.emit(''); }
  }
}
