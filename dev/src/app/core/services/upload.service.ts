// src/app/core/services/upload.service.ts
// Handles image uploads → backend → Cloudinary CDN.
// Returns the secure Cloudinary URL to store in MongoDB.
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { map, catchError } from 'rxjs/operators';
import { throwError } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface UploadResult {
  url: string;
  publicId: string;
}

@Injectable({ providedIn: 'root' })
export class UploadService {
  private readonly API = `${environment.apiUrl}/uploads`;

  constructor(private http: HttpClient) {}

  /**
   * Upload a single image file.
   * @param file   File from <input type="file">
   * @param type   'avatar' | 'provider' | 'banner'  (controls crop preset)
   * @param folder Optional Cloudinary sub-folder (e.g. 'nearby/providers')
   */
  uploadImage(file: File, type: 'avatar' | 'provider' | 'banner' = 'provider', folder?: string) {
    const form = new FormData();
    form.append('image', file);
    const params: Record<string, string> = { type };
    if (folder) params['folder'] = folder;
    const query = new URLSearchParams(params).toString();

    return this.http.post<any>(`${this.API}/image?${query}`, form).pipe(
      map(res => res.data as UploadResult),
      catchError(err => throwError(() => err.error?.message ?? 'Image upload failed')),
    );
  }

  /**
   * Upload multiple images (max 5).
   * Returns array of { url, publicId }.
   */
  uploadImages(files: File[], folder = 'Nearby/providers') {
    const form = new FormData();
    files.forEach(f => form.append('images', f));

    return this.http.post<any>(`${this.API}/images?folder=${folder}`, form).pipe(
      map(res => res.data.images as UploadResult[]),
      catchError(err => throwError(() => err.error?.message ?? 'Image upload failed')),
    );
  }
}
