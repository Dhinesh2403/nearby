// src/app/core/services/admob.service.ts
// Thin, platform-safe wrapper around @capacitor-community/admob.
//
// Design goals (Phase 6):
//  • Real banner + rewarded ads inside a Capacitor native build.
//  • On the web (or when the plugin/native layer is missing) every call
//    becomes a graceful no-op — nothing crashes, slots simply stay hidden
//    (6.6).
//  • All ad behaviour respects the admin toggles + ad-unit IDs delivered by
//    SettingsService (/settings/public) (6.4, 6.7).
//
// The plugin is imported dynamically and only on a native platform, so the
// web bundle never pulls in native-only code paths.
import { Injectable, signal } from '@angular/core';
import { SettingsService } from './settings.service';

// Test ad unit IDs from Google — safe to ship; swapped for real IDs
// (from the admin panel) at runtime when provided.
const TEST_BANNER   = 'ca-app-pub-3940256099942544/6300978111';
const TEST_REWARDED = 'ca-app-pub-3940256099942544/5224354917';

@Injectable({ providedIn: 'root' })
export class AdMobService {
  private initialised = false;
  private native = false;
  private admob: any = null;            // lazily-loaded plugin module
  readonly ready = signal(false);

  constructor(private settings: SettingsService) {}

  // True only inside a Capacitor native shell with the plugin present.
  private async ensureInit(): Promise<boolean> {
    if (this.initialised) return this.native;
    this.initialised = true;
    try {
      const core = await import('@capacitor/core');
      this.native = core.Capacitor?.isNativePlatform?.() ?? false;
      if (!this.native) return false;

      const mod = await import('@capacitor-community/admob');
      this.admob = mod.AdMob;
      // initializeForTesting: true  → shows Google test ads (safe for dev/QA)
      // Set to false only when your real Ad Unit IDs are live in the admin panel.
      const testing = !this.settings.settings()?.bannerAdUnitId;
      await this.admob.initialize({ initializeForTesting: testing });
      this.ready.set(true);
      return true;
    } catch {
      // Web or plugin unavailable — stay in no-op mode.
      this.native = false;
      return false;
    }
  }

  // Master gate: ads must be enabled by the admin AND we must be native.
  private adsAllowed(): boolean {
    const s = this.settings.settings();
    // If settings haven't loaded yet, default to allowed (native will still
    // guard); when loaded, honour the admin master switch (6.7).
    return s ? s.adsEnabled : true;
  }

  private bannerUnitId(): string {
    return this.settings.settings()?.bannerAdUnitId || TEST_BANNER;
  }

  private rewardedUnitId(): string {
    return this.settings.settings()?.rewardedAdUnitId || TEST_REWARDED;
  }

  // ── BANNER (6.2) ─────────────────────────────────────────────
  async showBanner(): Promise<void> {
    if (!this.adsAllowed()) return;
    if (!(await this.ensureInit())) return;     // web → no-op
    try {
      const { BannerAdPosition, BannerAdSize } = await import('@capacitor-community/admob');
      await this.admob.showBanner({
        adId: this.bannerUnitId(),
        adSize: BannerAdSize.ADAPTIVE_BANNER,
        position: BannerAdPosition.BOTTOM_CENTER,
        margin: 0,
      });
    } catch { /* graceful — hide slot */ }
  }

  async hideBanner(): Promise<void> {
    if (!this.native || !this.admob) return;
    try { await this.admob.hideBanner(); await this.admob.removeBanner(); } catch { /* ignore */ }
  }

  // ── REWARDED (6.3) ───────────────────────────────────────────
  // Resolves true only when the user fully watched the ad and earned the
  // reward. On web/no-ads it resolves false so callers can fall back.
  async showRewarded(): Promise<boolean> {
    const s = this.settings.settings();
    if (s && (!s.adsEnabled || !s.rewardedAdsEnabled)) return false;   // (6.7)
    if (!(await this.ensureInit())) return false;                      // web → no-op
    try {
      await this.admob.prepareRewardVideoAd({ adId: this.rewardedUnitId() });
      const result = await this.admob.showRewardVideoAd();
      // A reward object (with `amount`) indicates a completed view.
      return !!result;
    } catch {
      return false;
    }
  }

  // Whether a real native ad layer is available (used to decide fallback).
  async isAdLayerAvailable(): Promise<boolean> {
    return this.ensureInit();
  }
}
