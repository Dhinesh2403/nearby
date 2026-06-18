// src/app/shared/components/adsense-ad.component.ts
// Reusable Google AdSense unit — renders an <ins class="adsbygoogle"> slot.
// Usage: <app-adsense-ad slot="1234567890" format="auto" />
//
// AdSense loads via the global script in index.html.
// Each component instance pushes its slot to (adsbygoogle) on AfterViewInit.
import {
  Component, Input, AfterViewInit, OnDestroy,
  ElementRef, ViewChild, PLATFORM_ID, Inject,
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { environment } from '../../../environments/environment';

declare var adsbygoogle: any[];

@Component({
  selector: 'app-adsense-ad',
  standalone: true,
  template: `
    @if (show) {
      <div class="adsense-wrap" [class]="wrapClass">
        <span class="ad-label">Advertisement</span>
        <ins #insEl
          class="adsbygoogle"
          style="display:block"
          [attr.data-ad-client]="publisherId"
          [attr.data-ad-slot]="slot"
          [attr.data-ad-format]="format"
          [attr.data-full-width-responsive]="responsive ? 'true' : null">
        </ins>
      </div>
    }
  `,
  styles: [`
    .adsense-wrap { width:100%; overflow:hidden; }
    .adsense-wrap.wrap-banner { background:var(--nb-surface-2); border-top:1px solid var(--nb-border); padding:4px 0; text-align:center; }
    .adsense-wrap.wrap-inline { margin:16px 0; text-align:center; }
    .ad-label { display:block; font-size:.6rem; color:var(--nb-text-muted); text-transform:uppercase; letter-spacing:.05em; margin-bottom:2px; }
  `],
})
export class AdsenseAdComponent implements AfterViewInit, OnDestroy {
  /** Ad slot ID from AdSense dashboard → Ads → By ad unit */
  @Input() slot!: string;
  /** 'auto' | 'fluid' | 'rectangle' | 'vertical' | 'horizontal' */
  @Input() format: string = 'auto';
  /** Whether to use full-width responsive */
  @Input() responsive: boolean = true;
  /** CSS class applied to wrapper: 'wrap-banner' | 'wrap-inline' */
  @Input() wrapClass: string = 'wrap-inline';

  @ViewChild('insEl') insEl!: ElementRef<HTMLElement>;

  readonly publisherId = environment.adsense?.publisherId ?? '';
  show = false;

  constructor(
    @Inject(PLATFORM_ID) private platformId: object,
  ) {
    // Only render on browser; SSR would have no adsbygoogle global.
    this.show = isPlatformBrowser(this.platformId)
      && !!environment.adsense?.publisherId
      && environment.adsense.publisherId !== 'ca-pub-6613739357752442';
  }

  ngAfterViewInit() {
    if (!this.show) return;
    try {
      // Push the slot to AdSense — it renders as soon as the script is ready.
      (window as any).adsbygoogle = (window as any).adsbygoogle || [];
      (window as any).adsbygoogle.push({});
    } catch { /* AdSense not loaded yet — will render on next page interaction */ }
  }

  ngOnDestroy() {
    // No teardown needed — AdSense manages its own DOM cleanup.
  }
}
