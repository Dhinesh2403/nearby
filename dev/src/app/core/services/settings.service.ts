// src/app/core/services/settings.service.ts
// Loads public platform settings (announcement, feature flags, recently
// banned providers) used by the homepage banners and feature gating.
import { Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';

export interface PublicSettings {
  announcement: { active: boolean; text: string };
  otpEnabled: boolean;
  otpCustomerEnabled: boolean;
  otpProviderEnabled: boolean;
  adsEnabled: boolean;
  rewardedAdsEnabled: boolean;
  whoVisitedEnabled: boolean;
  registrationsEnabled: boolean;
  complaintsEnabled: boolean;
  featuredCategories: string[];
  bannerAdUnitId: string;
  rewardedAdUnitId: string;
  recentlyBanned: string[];
}

@Injectable({ providedIn: 'root' })
export class SettingsService {
  readonly settings = signal<PublicSettings | null>(null);

  constructor(private http: HttpClient) {}

  load() {
    this.http.get<any>(`${environment.apiUrl}/settings/public`).subscribe({
      next: res => this.settings.set(res.data),
      error: () => { /* keep defaults (null) — banners simply hide */ },
    });
  }
}
