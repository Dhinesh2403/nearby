// src/app/services/seo.service.ts
// Global SEO helper: sets the page <title> and the meta tags that matter for
// search + social previews (description, keywords, Open Graph, Twitter Card)
// and keeps the canonical <link> in sync with the current route.
import { Injectable, inject } from '@angular/core';
import { DOCUMENT } from '@angular/common';
import { Title, Meta } from '@angular/platform-browser';
import { Router } from '@angular/router';

const SITE_NAME = 'NearbyPro';
const BASE_URL  = 'https://nearbypro.online';
const DEFAULT_IMAGE = `${BASE_URL}/assets/brand/og-image.png`;

export interface SeoOptions {
  /** Absolute or root-relative URL for canonical + og:url. Defaults to the current route. */
  url?: string;
  /** Social share image. Defaults to the brand OG image. */
  image?: string;
}

@Injectable({ providedIn: 'root' })
export class SeoService {
  private title  = inject(Title);
  private meta   = inject(Meta);
  private router = inject(Router);
  private doc    = inject(DOCUMENT);

  /**
   * Set the SEO metadata for the current page.
   * @param title       Page title (site name is appended automatically if missing).
   * @param description Meta description (~150–160 chars ideal).
   * @param keywords    Optional comma-separated keywords.
   * @param options     Optional canonical url / social image overrides.
   */
  setSeo(title: string, description: string, keywords?: string, options: SeoOptions = {}): void {
    const fullTitle = title.includes(SITE_NAME) ? title : `${title} | ${SITE_NAME}`;
    const url   = this.resolveUrl(options.url);
    const image = options.image ?? DEFAULT_IMAGE;

    this.title.setTitle(fullTitle);
    this.meta.updateTag({ name: 'description', content: description });

    if (keywords) {
      this.meta.updateTag({ name: 'keywords', content: keywords });
    }

    // Open Graph
    this.meta.updateTag({ property: 'og:title', content: fullTitle });
    this.meta.updateTag({ property: 'og:description', content: description });
    this.meta.updateTag({ property: 'og:url', content: url });
    this.meta.updateTag({ property: 'og:image', content: image });
    this.meta.updateTag({ property: 'og:type', content: 'website' });
    this.meta.updateTag({ property: 'og:site_name', content: SITE_NAME });

    // Twitter Card
    this.meta.updateTag({ name: 'twitter:card', content: 'summary_large_image' });
    this.meta.updateTag({ name: 'twitter:title', content: fullTitle });
    this.meta.updateTag({ name: 'twitter:description', content: description });
    this.meta.updateTag({ name: 'twitter:image', content: image });

    this.setCanonical(url);
  }

  /** Update (or create) the canonical <link> in <head>. */
  setCanonical(url: string): void {
    const href = this.resolveUrl(url);
    let link = this.doc.querySelector<HTMLLinkElement>('link[rel="canonical"]');
    if (!link) {
      link = this.doc.createElement('link');
      link.setAttribute('rel', 'canonical');
      this.doc.head.appendChild(link);
    }
    link.setAttribute('href', href);
  }

  /** Normalise a path/url into an absolute https URL on the live domain. */
  private resolveUrl(url?: string): string {
    if (url && /^https?:\/\//i.test(url)) return url;
    const path = url ?? this.router.url;
    const clean = path.split('?')[0].split('#')[0];
    return `${BASE_URL}${clean === '/' ? '/' : clean.replace(/\/$/, '')}`;
  }
}
