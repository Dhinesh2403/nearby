// src/app/shared/components/banner-ad.component.ts
// Bottom-of-page ad slot:
//  • Native (Capacitor): real AdMob adaptive banner via AdMobService.
//  • Web: real Google AdSense unit (ins.adsbygoogle) when slot ID is configured;
//         falls back to a subtle placeholder if not yet set up.
import { Component, OnInit, OnDestroy, signal, PLATFORM_ID, Inject } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { AdMobService } from '../../core/services/admob.service';
import { SettingsService } from '../../core/services/settings.service';
import { AdsenseAdComponent } from './adsense-ad.component';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-banner-ad',
  standalone: true,
  imports: [CommonModule, AdsenseAdComponent],
  template: `
    @if (showNativePlaceholder()) {
      <!-- Native: real banner rendered by OS overlay below this invisible spacer -->
      <div style="height:60px"></div>
    }
    @if (showAdsense()) {
      <!-- Web: real AdSense unit -->
      <app-adsense-ad
        [slot]="adsenseSlot"
        format="auto"
        [responsive]="true"
        wrapClass="wrap-banner">
      </app-adsense-ad>
    }
    @if (showPlaceholder()) {
      <!-- Web fallback: placeholder when AdSense slot not configured yet -->
      <div class="ad-slot" role="complementary" aria-label="Advertisement">
        <span class="ad-tag">Ad</span>
        <span class="ad-hint">Sponsored · ads support free listings on NearBy</span>
      </div>
    }
  `,
  styles: [`
    .ad-slot { display:flex; align-items:center; justify-content:center; gap:10px;
      background:var(--nb-surface-2); border-top:1px solid var(--nb-border);
      padding:14px 16px; font-size:.8rem; color:var(--nb-text-muted); position:relative; }
    .ad-tag { position:absolute; left:12px; top:50%; transform:translateY(-50%);
      background:var(--nb-text-light); color:#fff; font-size:.6rem; font-weight:700;
      padding:1px 6px; border-radius:4px; text-transform:uppercase; letter-spacing:.05em; }
  `]
})
export class BannerAdComponent implements OnInit, OnDestroy {
  showNativePlaceholder = signal(false);
  showAdsense           = signal(false);
  showPlaceholder       = signal(false);

  // Slot ID for browse page banner — update from environment once you have the real ID
  readonly adsenseSlot = environment.adsense?.slots?.browseBanner ?? '';

  constructor(
    private admob: AdMobService,
    private settings: SettingsService,
    @Inject(PLATFORM_ID) private platformId: object,
  ) {}

  async ngOnInit() {
    const native = await this.admob.isAdLayerAvailable();
    if (native) {
      this.showNativePlaceholder.set(true);
      this.admob.showBanner();
      return;
    }

    if (!isPlatformBrowser(this.platformId)) return;

    const s = this.settings.settings();
    const adsEnabled = s ? s.adsEnabled : true;
    if (!adsEnabled) return;

    // Use AdSense if we have a real slot ID (not the placeholder '000...')
    const hasRealSlot = this.adsenseSlot && !this.adsenseSlot.startsWith('000');
    if (hasRealSlot) {
      this.showAdsense.set(true);
    } else {
      // Still awaiting slot IDs — show a placeholder so the space is reserved
      this.showPlaceholder.set(true);
    }
  }

  ngOnDestroy() {
    this.admob.hideBanner();
  }
}
