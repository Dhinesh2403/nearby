// src/app/features/static/blog.component.ts
// Static blog listing page with sample articles about local services.
import { Component, OnInit, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { SeoService } from '../../services/seo.service';

interface Post {
  slug: string;
  title: string;
  excerpt: string;
  category: string;
  date: string;
  readTime: string;
  icon: string;
}

@Component({
  selector: 'app-blog',
  standalone: true,
  imports: [RouterLink],
  template: `
    <div class="page-wrap">
      <div class="container">
        <nav class="page-crumb">
          <a routerLink="/">Home</a> <span>/</span> Blog
        </nav>

        <header class="page-head">
          <h1>NearbyPro Blog</h1>
          <p class="page-lede">
            Practical guides and insights on hiring local services, growing a small business, and the
            rise of hyperlocal marketplaces across India.
          </p>
        </header>

        <div class="blog-grid">
          @for (post of posts; track post.slug) {
            <a class="blog-card" [routerLink]="['/blog', post.slug]">
              <div class="blog-thumb"><i class="bi" [class]="post.icon"></i></div>
              <div class="blog-content">
                <span class="blog-cat">{{ post.category }}</span>
                <h2>{{ post.title }}</h2>
                <p class="blog-excerpt">{{ post.excerpt }}</p>
                <div class="blog-meta">
                  <span><i class="bi bi-calendar3 me-1"></i>{{ post.date }}</span>
                  <span><i class="bi bi-clock me-1"></i>{{ post.readTime }}</span>
                </div>
                <span class="blog-readmore">Read article <i class="bi bi-arrow-right"></i></span>
              </div>
            </a>
          }
        </div>

        <p class="page-foot">
          Want to be featured by customers near you?
          <a routerLink="/provider-signup">List your business on NearbyPro</a> for free.
        </p>
      </div>
    </div>
  `,
  styles: [`
    .page-wrap { background:var(--nb-bg); min-height:70vh; padding:2.5rem 0 4rem; }
    .page-crumb { font-size:.8rem; color:var(--nb-text-muted); margin-bottom:1.25rem; }
    .page-crumb a { color:var(--nb-primary); text-decoration:none; }
    .page-crumb span { margin:0 .4rem; }
    .page-head { border-bottom:1px solid var(--nb-border); padding-bottom:1.5rem; margin-bottom:1.75rem; }
    .page-head h1 { font-family:var(--font-display); font-weight:800; font-size:2.2rem; margin:0 0 .6rem; }
    .page-lede { font-size:1.05rem; line-height:1.7; color:var(--nb-text); max-width:760px; margin:0; }
    .blog-grid { display:grid; grid-template-columns:repeat(3, 1fr); gap:1.25rem; }
    .blog-card { background:var(--nb-surface); border:1px solid var(--nb-border); border-radius:var(--radius-lg); overflow:hidden; display:flex; flex-direction:column; transition:box-shadow .25s, transform .25s; text-decoration:none; color:inherit; }
    .blog-card:hover { box-shadow:var(--shadow-lg); transform:translateY(-4px); }
    .blog-readmore { font-family:var(--font-display); font-size:.82rem; font-weight:700; color:var(--nb-primary); margin-top:.85rem; display:inline-flex; align-items:center; gap:.35rem; }
    .blog-card:hover .blog-readmore i { transform:translateX(3px); transition:transform .2s; }
    .blog-thumb { height:140px; background:linear-gradient(135deg,var(--nb-primary),var(--nb-primary-light)); display:flex; align-items:center; justify-content:center; }
    .blog-thumb i { font-size:2.6rem; color:var(--nb-accent-light); }
    .blog-content { padding:1.1rem 1.25rem 1.35rem; display:flex; flex-direction:column; flex:1; }
    .blog-cat { font-family:var(--font-display); font-size:.7rem; font-weight:700; text-transform:uppercase; letter-spacing:.05em; color:var(--nb-primary-light); }
    .blog-card h2 { font-family:var(--font-display); font-weight:700; font-size:1.08rem; line-height:1.35; margin:.4rem 0 .55rem; color:var(--nb-text); }
    .blog-excerpt { font-size:.9rem; line-height:1.6; color:var(--nb-text-muted); margin:0 0 1rem; flex:1; }
    .blog-meta { display:flex; gap:1rem; font-size:.78rem; color:var(--nb-text-light); border-top:1px solid var(--nb-border); padding-top:.75rem; }
    .page-foot { margin-top:2.5rem; padding-top:1.25rem; border-top:1px solid var(--nb-border); font-size:.95rem; }
    .page-foot a { color:var(--nb-primary); }
    @media (max-width:900px) { .blog-grid { grid-template-columns:1fr 1fr; } }
    @media (max-width:600px) { .blog-grid { grid-template-columns:1fr; } .page-head h1 { font-size:1.8rem; } }
  `]
})
export class BlogComponent implements OnInit {
  posts: Post[] = [
    {
      slug: 'find-trusted-plumber-coimbatore',
      title: 'How to Find a Trusted Plumber Near You in Coimbatore',
      category: 'Hiring Guide',
      date: '12 June 2026',
      readTime: '5 min read',
      icon: 'bi-tools',
      excerpt: 'A burst pipe or a leaking tap rarely waits for a convenient time. Here\'s how to quickly ' +
               'find a reliable plumber nearby — checking verified reviews, comparing quotes upfront, ' +
               'confirming experience, and avoiding common booking mistakes that lead to overcharging.'
    },
    {
      slug: 'benefits-of-hiring-local-professionals',
      title: 'Top 5 Benefits of Hiring Local Professionals',
      category: 'Insights',
      date: '5 June 2026',
      readTime: '5 min read',
      icon: 'bi-people',
      excerpt: 'Hiring someone from your own neighbourhood means faster response times, fair local pricing, ' +
               'accountability through community reputation, and support for small businesses around you. ' +
               'We break down the five biggest reasons going local beats going far.'
    },
    {
      slug: 'why-hyperlocal-marketplaces-growing-india',
      title: 'Why Hyperlocal Service Marketplaces Are Growing in India',
      category: 'Trends',
      date: '28 May 2026',
      readTime: '6 min read',
      icon: 'bi-graph-up-arrow',
      excerpt: 'From metro cities to tier-2 towns, Indians are increasingly turning to hyperlocal platforms ' +
               'to find everyday services. We explore the smartphone boom, the trust gap in word-of-mouth ' +
               'hiring, and how digital discovery is reshaping the local services economy.'
    },
  ];

  private seo = inject(SeoService);

  ngOnInit(): void {
    this.seo.setSeo(
      'Blog — Local Services Tips & Insights | NearbyPro',
      'The NearbyPro blog: practical guides on hiring trusted local professionals, the benefits ' +
        'of going local, and why hyperlocal service marketplaces are growing across India.',
      'local services blog, find a plumber, hire local professionals, hyperlocal marketplace India, NearbyPro'
    );
  }
}
