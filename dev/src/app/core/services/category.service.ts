import { Injectable, signal } from '@angular/core';
import { ApiService } from './api.service';

export interface Category {
  id: string;
  label: string;
  icon: string;
  color: string;
  image?: string;
  subCategories: string[];
  count?: number;
  featured?: boolean;
}

@Injectable({ providedIn: 'root' })
export class CategoryService {
  private _cats = signal<Category[]>([]);
  private _fetched = false;

  readonly cats = this._cats.asReadonly();

  constructor(private api: ApiService) {}

  load() {
    if (this._fetched) return;
    this._fetched = true;
    this.api.get<{ data: Category[] }>('/categories').subscribe({
      next: res => this._cats.set(res.data ?? []),
      error: () => {},
    });
  }

  label(id: string): string { return this._cats().find(c => c.id === id)?.label ?? id; }
  color(id: string): string { return this._cats().find(c => c.id === id)?.color ?? '#1A3C5E'; }
  icon(id: string):  string { return this._cats().find(c => c.id === id)?.icon  ?? 'bi-tag'; }
  subCategories(id: string): string[] { return this._cats().find(c => c.id === id)?.subCategories ?? []; }
}
