// src/app/features/static/blog/article-layout.component.ts
// Shared presentational wrapper for individual blog articles: breadcrumb,
// header (title + meta) and a projected article body. Keeps every article
// visually consistent with the rest of the static pages.
import { Component, Input } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-article-layout',
  standalone: true,
  imports: [RouterLink],
  template: `
    <div class="page-wrap">
      <div class="container">
        <nav class="page-crumb">
          <a routerLink="/">Home</a> <span>/</span>
          <a routerLink="/blog">Blog</a> <span>/</span> {{ category }}
        </nav>

        <header class="article-head">
          <span class="article-cat">{{ category }}</span>
          <h1>{{ title }}</h1>
          <div class="article-meta">
            <span><i class="bi bi-calendar3 me-1"></i>{{ date }}</span>
            <span><i class="bi bi-clock me-1"></i>{{ readTime }}</span>
          </div>
        </header>

        <article class="article-body">
          <ng-content></ng-content>
        </article>

        <p class="page-foot">
          <a routerLink="/blog"><i class="bi bi-arrow-left me-1"></i>Back to all articles</a>
        </p>
      </div>
    </div>
  `,
  styles: [`
    .page-wrap { background:var(--nb-bg); min-height:70vh; padding:2.5rem 0 4rem; }
    .page-crumb { font-size:.8rem; color:var(--nb-text-muted); margin-bottom:1.25rem; }
    .page-crumb a { color:var(--nb-primary); text-decoration:none; }
    .page-crumb span { margin:0 .4rem; }
    .article-head { max-width:760px; border-bottom:1px solid var(--nb-border); padding-bottom:1.5rem; margin-bottom:1.75rem; }
    .article-cat { font-family:var(--font-display); font-size:.72rem; font-weight:700; text-transform:uppercase; letter-spacing:.05em; color:var(--nb-primary-light); }
    .article-head h1 { font-family:var(--font-display); font-weight:800; font-size:2.1rem; line-height:1.25; margin:.5rem 0 .8rem; }
    .article-meta { display:flex; gap:1.25rem; font-size:.82rem; color:var(--nb-text-muted); }
    .article-body { max-width:760px; }
    .article-body ::ng-deep p { color:var(--nb-text); font-size:1rem; line-height:1.8; margin:0 0 1.1rem; }
    .article-body ::ng-deep h2 { font-family:var(--font-display); font-weight:700; font-size:1.35rem; margin:2rem 0 .75rem; color:var(--nb-text); }
    .article-body ::ng-deep ul, .article-body ::ng-deep ol { padding-left:1.3rem; margin:0 0 1.1rem; }
    .article-body ::ng-deep li { color:var(--nb-text); font-size:1rem; line-height:1.75; margin-bottom:.45rem; }
    .article-body ::ng-deep a { color:var(--nb-primary); }
    .page-foot { max-width:760px; margin-top:2.5rem; padding-top:1.25rem; border-top:1px solid var(--nb-border); font-size:.95rem; }
    .page-foot a { color:var(--nb-primary); text-decoration:none; }
    @media (max-width:640px) { .article-head h1 { font-size:1.6rem; } }
  `]
})
export class ArticleLayoutComponent {
  @Input() title = '';
  @Input() category = '';
  @Input() date = '';
  @Input() readTime = '';
}
