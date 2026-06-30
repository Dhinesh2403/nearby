// src/app/shared/components/jd-search-bar.component.ts
// JustDial-style two-box search: [ location ] [ service keyword ] [ Search ]
// Covers Phase 11A (11.1-11.5), 11B (11.6-11.9) and parts of 11E (11.28-11.30).
import { Component, OnInit, OnDestroy, signal, computed, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { DISTRICTS } from '../../core/constants';
import { CategoryService } from '../../core/services/category.service';
import { ApiService, Provider } from '../../core/services/api.service';

const PLACEHOLDERS = [
  'Search for Plumbers & Electricians', 'Search for Custom Cakes', 'Search for Yoga Classes',
  'Search for Maths Tutors', 'Search for Tiffin Service', 'Search for Beauty Salons',
  'Search for Wedding Photographers', 'Search for AC & Appliance Repair',
  'Search for Packers & Movers', 'Search for Dog Grooming', 'Search for Driving School',
  'Search for Chartered Accountant', 'Search for Interior Designers', 'Search for Personal Trainer',
];
const TRENDING = [
  'Beauty Salon', 'Home Cleaning', 'Cake Shops', 'Yoga Classes', 'Car Service',
  'AC Repair', 'Packers & Movers', 'Wedding Photographer',
];
const RECENT_KEY = 'nb_recent_searches';
const RECENT_LOC_KEY = 'nb_recent_locations';

@Component({
  selector: 'app-jd-search-bar',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="jd-bar">
      <!-- LOCATION BOX -->
      <div class="jd-box jd-loc">
        <i class="bi bi-geo-alt-fill jd-pin"></i>
        <input type="text" [(ngModel)]="location" class="jd-input"
               placeholder="Location" aria-label="Location"
               (focus)="svcOpen.set(false); locOpen.set(true)" (blur)="closeSoon('loc')" (ngModelChange)="locOpen.set(true)" />
        @if (locOpen()) {
          <div class="jd-drop" (mousedown)="$event.preventDefault()">
            @if (recentLocations().length) {
              <div class="jd-drop-row"><p class="jd-drop-h">Recent</p>
                <button class="jd-clear" (click)="clearRecentLocations()">Clear All</button></div>
              @for (l of recentLocations(); track l) {
                <div class="jd-item" (click)="pickLocation(l)"><i class="bi bi-clock-history"></i><span>{{ l }}</span></div>
              }
            }
            <p class="jd-drop-h">Cities</p>
            @for (d of filteredDistricts; track d) {
              <div class="jd-item" (click)="pickLocation(d)"><i class="bi bi-geo-alt"></i><span>{{ d }}</span></div>
            }
          </div>
        }
      </div>

      <div class="jd-divider"></div>

      <!-- SERVICE BOX -->
      <div class="jd-box jd-svc">
        <i class="bi bi-search jd-sicon"></i>
        <input type="text" [(ngModel)]="q" class="jd-input"
               [placeholder]="placeholder()" aria-label="Search services"
               (focus)="locOpen.set(false); svcOpen.set(true)" (blur)="closeSoon('svc')"
               (ngModelChange)="onQueryChange()" (keyup.enter)="go()" />
        @if (voiceSupported) {
          <button class="jd-mic" [class.on]="listening()" (click)="startVoice()" title="Voice search" type="button">
            <i class="bi bi-mic-fill"></i>
          </button>
        }
        @if (svcOpen()) {
          <div class="jd-drop" (mousedown)="$event.preventDefault()">
            @if (!q && recentSearches().length) {
              <div class="jd-drop-row"><p class="jd-drop-h">Recent Searches</p>
                <button class="jd-clear" (click)="clearRecents()">Clear All</button></div>
              @for (r of recentSearches(); track r) {
                <div class="jd-item" (click)="pickService(r)"><i class="bi bi-clock-history"></i><span>{{ r }}</span></div>
              }
            }
            @if (!q) {
              <p class="jd-drop-h"><i class="bi bi-graph-up-arrow me-1"></i>Trending Searches</p>
              @for (t of trending; track t) {
                <div class="jd-item" (click)="pickService(t)"><i class="bi bi-arrow-up-right"></i><span>{{ t }}</span></div>
              }
            } @else {
              <!-- Category / service suggestions (DB categories first, matched text bolded) -->
              @for (s of filteredServices; track s.name) {
                <div class="jd-item jd-sug" (click)="pickSuggestion(s)">
                  <i class="bi" [ngClass]="s.icon || 'bi-search'"></i>
                  <span><strong [innerHTML]="highlightHtml(s.name)"></strong><small>{{ s.category }}</small></span>
                </div>
              }

              <!-- Live provider results (debounced /providers search) -->
              @if (searchingProviders()) {
                <div class="jd-item jd-no-result"><i class="bi bi-hourglass-split"></i><span>Searching…</span></div>
              }
              @for (p of providerResults(); track p._id) {
                <div class="jd-item jd-prov" (click)="pickProvider(p)">
                  <span class="jd-prov-thumb" [style.background]="catSvc.color(p.category)">
                    @if (p.images && p.images.length) { <img [src]="p.images[0]" [alt]="p.businessName" /> }
                    @else { {{ p.businessName.charAt(0) }} }
                  </span>
                  <span class="jd-prov-body">
                    <strong [innerHTML]="highlightHtml(p.businessName)"></strong>
                    <small>
                      <span class="jd-prov-rate">{{ p.ratingAvg }} <i class="bi bi-star-fill"></i></span>
                      <span class="jd-prov-cnt">({{ p.ratingCount }})</span>
                      · {{ p.userId?.location?.area || p.userId?.location?.district || 'Coimbatore' }}
                    </small>
                  </span>
                </div>
              }

              @if (!filteredServices.length && !providerResults().length && !searchingProviders()) {
                <div class="jd-item jd-no-result"><i class="bi bi-slash-circle"></i><span>No categories found</span></div>
              }
            }
          </div>
        }
      </div>

      <button class="jd-btn" (click)="go()"><i class="bi bi-search me-1"></i>Search</button>
    </div>
  `,
  styles: [`
    .jd-bar { display:flex; align-items:stretch; background:#fff; border-radius:var(--radius-lg); box-shadow:0 8px 32px rgba(0,0,0,.18); max-width:680px; overflow:visible; }
    .jd-box { position:relative; display:flex; align-items:center; gap:8px; padding:0 14px; }
    .jd-loc { flex:0 0 38%; }
    .jd-svc { flex:1; }
    .jd-pin { color:var(--nb-danger); }
    .jd-sicon { color:var(--nb-text-muted); }
    .jd-input { border:none; outline:none; background:transparent; font-family:var(--font-body); font-size:.92rem; width:100%; padding:14px 0; }
    .jd-divider { width:1px; background:var(--nb-border); margin:10px 0; }
    .jd-mic { background:none; border:none; color:var(--nb-text-muted); cursor:pointer; font-size:1rem; padding:4px; border-radius:50%; transition:all .2s; }
    .jd-mic.on { color:var(--nb-danger); animation:micPulse 1s infinite; }
    @keyframes micPulse { 0%,100%{ transform:scale(1);} 50%{ transform:scale(1.2);} }
    .jd-btn { background:var(--nb-accent); color:var(--nb-primary); border:none; border-radius:0 var(--radius-lg) var(--radius-lg) 0; padding:0 26px; font-family:var(--font-display); font-weight:700; cursor:pointer; white-space:nowrap; transition:background .2s; }
    .jd-btn:hover { background:var(--nb-accent-light); }
    .jd-drop { position:absolute; top:calc(100% + 6px); left:0; right:0; background:#fff; border:1px solid var(--nb-border); border-radius:var(--radius-md); box-shadow:var(--shadow-lg); max-height:340px; overflow-y:auto; z-index:9999; padding:6px 0; min-width:240px; }
    .jd-drop-h { font-size:.68rem; font-weight:700; text-transform:uppercase; letter-spacing:.05em; color:var(--nb-text-muted); margin:8px 14px 4px; }
    .jd-drop-row { display:flex; justify-content:space-between; align-items:center; }
    .jd-clear { background:none; border:none; color:var(--nb-primary); font-size:.72rem; font-weight:700; cursor:pointer; margin-right:12px; }
    .jd-item { display:flex; align-items:center; gap:10px; padding:9px 14px; cursor:pointer; font-size:.875rem; color:var(--nb-text); transition:background .12s; }
    .jd-item:hover { background:var(--nb-surface-2); }
    .jd-item i { color:var(--nb-text-muted); font-size:.85rem; }
.jd-sug span { display:flex; flex-direction:column; line-height:1.2; }
    .jd-sug small { color:var(--nb-text-muted); font-size:.7rem; text-transform:capitalize; }
    .jd-no-result { color:var(--nb-text-muted); cursor:default; font-size:.82rem; }
    .jd-no-result:hover { background:none; }
    .jd-sug strong b, .jd-prov strong b { color:var(--nb-primary); font-weight:800; }
    /* provider result rows */
    .jd-prov { align-items:center; gap:12px; }
    .jd-prov-thumb { width:38px; min-width:38px; height:38px; border-radius:8px; overflow:hidden; display:flex; align-items:center; justify-content:center; color:#fff; font-weight:800; font-size:1rem; text-transform:uppercase; }
    .jd-prov-thumb img { width:100%; height:100%; object-fit:cover; }
    .jd-prov-body { display:flex; flex-direction:column; line-height:1.25; min-width:0; }
    .jd-prov-body strong { font-weight:600; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
    .jd-prov-body small { color:var(--nb-text-muted); font-size:.72rem; display:flex; align-items:center; gap:5px; }
    .jd-prov-rate { background:#1a7a4a; color:#fff; border-radius:4px; padding:1px 5px; font-weight:700; display:inline-flex; align-items:center; gap:2px; }
    .jd-prov-rate i { color:#fff; font-size:.6rem; }
    .jd-prov-cnt { color:var(--nb-text-muted); }
    @media (max-width:560px){ .jd-bar{ flex-wrap:wrap; } .jd-loc,.jd-svc{ flex:1 1 100%; } .jd-divider{ display:none; } .jd-btn{ flex:1 1 100%; border-radius:0 0 var(--radius-lg) var(--radius-lg); padding:12px; } }
  `]
})
export class JdSearchBarComponent implements OnInit, OnDestroy {
  initialLocation = input<string>('');
  searchSubmit = output<{ location: string; q: string; category?: string }>();

  location = '';
  q = '';
  // When the user picks a DB-category suggestion (e.g. "Food & Catering") we
  // emit it as a category filter rather than a free-text keyword — the label
  // almost never appears in a provider's text fields, so a keyword search for
  // it returns nothing. Reset on any keystroke so a later free-text search
  // isn't wrongly scoped to a stale category.
  private pickedCategorySlug = '';
  locOpen = signal(false);
  svcOpen = signal(false);
  listening = signal(false);
  placeholderIdx = signal(0);

  recentSearches = signal<string[]>([]);
  recentLocations = signal<string[]>([]);
  trending = TRENDING;
  districts = DISTRICTS;

  // Live provider results for the typed query (debounced /providers search).
  providerResults    = signal<Provider[]>([]);
  searchingProviders = signal(false);

  private rotTimer: any;
  private blurTimer: any;
  private searchTimer: any;
  private recognition: any = null;
  voiceSupported = typeof (window as any) !== 'undefined' &&
    !!((window as any).webkitSpeechRecognition || (window as any).SpeechRecognition);

  placeholder = computed(() => PLACEHOLDERS[this.placeholderIdx() % PLACEHOLDERS.length]);

  get filteredDistricts() {
    const v = this.location.trim().toLowerCase();
    return (v ? DISTRICTS.filter(d => d.toLowerCase().includes(v)) : DISTRICTS).slice(0, 8);
  }

  // Static service-type suggestions shown alongside DB categories.
  // DB categories are the primary source — these supplement with specific service names.
  private readonly staticServices = [
    { name:'Plumber',              category:'Home Services' },
    { name:'Electrician',          category:'Home Services' },
    { name:'Carpenter',            category:'Home Services' },
    { name:'Painter',              category:'Home Services' },
    { name:'AC Repair',            category:'Home Services' },
    { name:'Appliance Repair',     category:'Home Services' },
    { name:'Pest Control',         category:'Home Services' },
    { name:'Maths Tutor',          category:'Education'     },
    { name:'Science Tutor',        category:'Education'     },
    { name:'English Tutor',        category:'Education'     },
    { name:'Coding Classes',       category:'Education'     },
    { name:'Dance Classes',        category:'Education'     },
    { name:'Tiffin Service',       category:'Food'          },
    { name:'Home Cook',            category:'Food'          },
    { name:'Catering Service',     category:'Food'          },
    { name:'Custom Cakes',         category:'Bakery'        },
    { name:'Sweet Shops',          category:'Bakery'        },
    { name:'Bridal Makeup',        category:'Beauty & Salon'},
    { name:'Makeup Artist',        category:'Beauty & Salon'},
    { name:'Mehndi Artist',        category:'Beauty & Salon'},
    { name:'Yoga Classes',         category:'Fitness'       },
    { name:'Personal Trainer',     category:'Fitness'       },
    { name:'Gym',                  category:'Fitness'       },
    { name:'Body Massage',         category:'Wellness'      },
    { name:'Physiotherapy',        category:'Wellness'      },
    { name:'Dietitian',            category:'Health'        },
    { name:'Nurse at Home',        category:'Health'        },
    { name:'Photography',          category:'Events'        },
    { name:'Wedding Planner',      category:'Events'        },
    { name:'Birthday Decoration',  category:'Events'        },
    { name:'Mobile Repair',        category:'Repair'        },
    { name:'Laptop Repair',        category:'Repair'        },
    { name:'Car Service',          category:'Automotive'    },
    { name:'Driving School',       category:'Automotive'    },
    { name:'Tailor',               category:'Fashion'       },
    { name:'Dog Grooming',         category:'Pet Care'      },
    { name:'Sofa Cleaning',        category:'Cleaning'      },
    { name:'Web Developer',        category:'IT'            },
    { name:'Computer Repair',      category:'IT'            },
    { name:'Packers & Movers',     category:'Transport'     },
    { name:'Chartered Accountant', category:'Finance'       },
    { name:'Interior Designer',    category:'Interior'      },
    { name:'Babysitter',           category:'Childcare'     },
  ];

  // DB categories take priority; static services fill remaining slots up to 8.
  get filteredServices(): { name: string; category: string; icon?: string; slug?: string }[] {
    const v = this.q.trim().toLowerCase();
    if (!v) return [];

    const catMatches = this.catSvc.cats()
      .filter(c => c.label.toLowerCase().includes(v))
      .map(c => ({ name: c.label, category: 'Category', icon: c.icon, slug: c.id }));

    const catNames = new Set(catMatches.map(c => c.name.toLowerCase()));
    const svcMatches = this.staticServices
      .filter(s => s.name.toLowerCase().includes(v) && !catNames.has(s.name.toLowerCase()));

    return [...catMatches, ...svcMatches].slice(0, 8);
  }

  constructor(
    readonly catSvc: CategoryService,
    private api: ApiService,
    private router: Router,
  ) {}

  // Fired on every keystroke in the service box. Filters categories instantly
  // (client-side, reactive) and debounces a live /providers search (300ms).
  onQueryChange() {
    this.svcOpen.set(true);
    this.pickedCategorySlug = '';   // typing invalidates a prior category pick
    clearTimeout(this.searchTimer);
    const q = this.q.trim();
    if (!q) { this.providerResults.set([]); this.searchingProviders.set(false); return; }
    this.searchingProviders.set(true);
    this.searchTimer = setTimeout(() => this.fetchProviders(q), 300);
  }

  private fetchProviders(q: string) {
    this.api.searchProviders({ search: q, limit: 3, sort: 'rating' }).subscribe({
      next: res => {
        // Ignore stale responses if the query changed while in flight.
        if (this.q.trim() !== q) return;
        this.providerResults.set(res.data ?? []);
        this.searchingProviders.set(false);
      },
      error: () => { if (this.q.trim() === q) this.searchingProviders.set(false); },
    });
  }

  // Bold the matched portion of a suggestion. Output is bound via [innerHTML];
  // Angular's sanitizer strips anything unsafe, and we HTML-escape each part.
  highlightHtml(text: string): string {
    const v = this.q.trim();
    if (!v) return this.esc(text);
    const idx = text.toLowerCase().indexOf(v.toLowerCase());
    if (idx < 0) return this.esc(text);
    return this.esc(text.slice(0, idx)) + '<b>' + this.esc(text.slice(idx, idx + v.length)) + '</b>' + this.esc(text.slice(idx + v.length));
  }
  private esc(s: string): string {
    return s.replace(/[&<>"]/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;' }[c]!));
  }

  pickProvider(p: Provider) {
    this.svcOpen.set(false);
    this.router.navigate(['/provider', p._id]);
  }

  ngOnInit() {
    this.catSvc.load();
    this.location = this.initialLocation();
    this.recentSearches.set(this.read(RECENT_KEY));
    this.recentLocations.set(this.read(RECENT_LOC_KEY));
    this.rotTimer = setInterval(() => this.placeholderIdx.update(i => i + 1), 2800);
  }

  ngOnDestroy() { clearInterval(this.rotTimer); clearTimeout(this.blurTimer); clearTimeout(this.searchTimer); }

  closeSoon(which: 'loc' | 'svc') {
    this.blurTimer = setTimeout(() => {
      if (which === 'loc') this.locOpen.set(false); else this.svcOpen.set(false);
    }, 150);
  }

  pickLocation(l: string) { this.location = l; this.locOpen.set(false); this.pushRecent(RECENT_LOC_KEY, l, this.recentLocations); }
  pickService(s: string)  { this.pickedCategorySlug = ''; this.q = s; this.svcOpen.set(false); this.go(); }

  // A picked suggestion that is a DB category becomes a category filter; a
  // service name (e.g. "Plumber") stays a free-text keyword search.
  pickSuggestion(s: { name: string; slug?: string }) {
    if (s.slug) { this.q = s.name; this.pickedCategorySlug = s.slug; this.svcOpen.set(false); this.go(); }
    else        { this.pickService(s.name); }
  }

  go() {
    const q = this.q.trim();
    const category = this.pickedCategorySlug;
    if (q) this.pushRecent(RECENT_KEY, q, this.recentSearches);
    if (this.location.trim()) this.pushRecent(RECENT_LOC_KEY, this.location.trim(), this.recentLocations);
    this.svcOpen.set(false); this.locOpen.set(false);
    this.searchSubmit.emit({ location: this.location.trim(), q, category: category || undefined });
    this.pickedCategorySlug = '';
  }

  clearRecents() { localStorage.removeItem(RECENT_KEY); this.recentSearches.set([]); }
  clearRecentLocations() { localStorage.removeItem(RECENT_LOC_KEY); this.recentLocations.set([]); }

  // Voice search (11.4) — Web Speech API
  startVoice() {
    const SR = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
    if (!SR) return;
    this.recognition = new SR();
    this.recognition.lang = 'en-IN';
    this.recognition.interimResults = false;
    this.listening.set(true);
    this.recognition.onresult = (e: any) => {
      this.q = e.results[0][0].transcript;
      this.listening.set(false);
      this.go();
    };
    this.recognition.onerror = () => this.listening.set(false);
    this.recognition.onend = () => this.listening.set(false);
    this.recognition.start();
  }

  private read(key: string): string[] {
    try { return JSON.parse(localStorage.getItem(key) || '[]'); } catch { return []; }
  }
  private pushRecent(key: string, val: string, sig: ReturnType<typeof signal<string[]>>) {
    const list = [val, ...this.read(key).filter(x => x.toLowerCase() !== val.toLowerCase())].slice(0, 5);
    localStorage.setItem(key, JSON.stringify(list));
    sig.set(list);
  }
}
