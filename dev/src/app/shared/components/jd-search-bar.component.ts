// src/app/shared/components/jd-search-bar.component.ts
// JustDial-style two-box search: [ location ] [ service keyword ] [ Search ]
// Covers Phase 11A (11.1-11.5), 11B (11.6-11.9) and parts of 11E (11.28-11.30).
import { Component, OnInit, OnDestroy, signal, computed, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DISTRICTS } from '../../core/constants';

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
            @for (d of filteredDistricts(); track d) {
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
               (ngModelChange)="svcOpen.set(true)" (keyup.enter)="go()" />
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
              @for (s of filteredServices(); track s.name) {
                <div class="jd-item jd-sug" (click)="pickService(s.name)">
                  <i class="bi bi-search"></i>
                  <span><strong>{{ s.name }}</strong><small>{{ s.category }}</small></span>
                </div>
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
    @media (max-width:560px){ .jd-bar{ flex-wrap:wrap; } .jd-loc,.jd-svc{ flex:1 1 100%; } .jd-divider{ display:none; } .jd-btn{ flex:1 1 100%; border-radius:0 0 var(--radius-lg) var(--radius-lg); padding:12px; } }
  `]
})
export class JdSearchBarComponent implements OnInit, OnDestroy {
  initialLocation = input<string>('');
  searchSubmit = output<{ location: string; q: string }>();

  location = '';
  q = '';
  locOpen = signal(false);
  svcOpen = signal(false);
  listening = signal(false);
  placeholderIdx = signal(0);

  recentSearches = signal<string[]>([]);
  recentLocations = signal<string[]>([]);
  trending = TRENDING;
  districts = DISTRICTS;

  private rotTimer: any;
  private blurTimer: any;
  private recognition: any = null;
  voiceSupported = typeof (window as any) !== 'undefined' &&
    !!((window as any).webkitSpeechRecognition || (window as any).SpeechRecognition);

  placeholder = computed(() => PLACEHOLDERS[this.placeholderIdx() % PLACEHOLDERS.length]);

  filteredDistricts = computed(() => {
    const v = this.location.trim().toLowerCase();
    return (v ? DISTRICTS.filter(d => d.toLowerCase().includes(v)) : DISTRICTS).slice(0, 8);
  });

  // Popular services with their category label (11.8) — expanded for all small-business types
  private services = [
    // Home Services
    { name:'Plumber', category:'Home Services' }, { name:'Electrician', category:'Home Services' },
    { name:'House Cleaning', category:'Home Services' }, { name:'Carpenter', category:'Home Services' },
    { name:'Painter', category:'Home Services' }, { name:'AC Repair', category:'Home Services' },
    { name:'Appliance Repair', category:'Home Services' }, { name:'Pest Control', category:'Home Services' },
    // Education
    { name:'Maths Tutor', category:'Education' }, { name:'Science Tutor', category:'Education' },
    { name:'English Tutor', category:'Education' }, { name:'Music Classes', category:'Education' },
    { name:'Drawing Classes', category:'Education' }, { name:'Coding Classes', category:'Education' },
    { name:'Dance Classes', category:'Education' }, { name:'Chess Coaching', category:'Education' },
    // Food & Catering
    { name:'Tiffin Service', category:'Food' }, { name:'Home Cook', category:'Food' },
    { name:'Catering Service', category:'Food' }, { name:'Biryani Catering', category:'Food' },
    { name:'Pickles & Homemade Food', category:'Food' }, { name:'Meal Subscription', category:'Food' },
    // Bakery
    { name:'Cake Shops', category:'Bakery' }, { name:'Custom Cakes', category:'Bakery' },
    { name:'Bakery', category:'Bakery' }, { name:'Sweet Shops', category:'Bakery' },
    { name:'Chocolates', category:'Bakery' }, { name:'Mithai', category:'Bakery' },
    // Beauty & Salon
    { name:'Beauty Salon', category:'Beauty & Salon' }, { name:'Hair Salon', category:'Beauty & Salon' },
    { name:'Bridal Makeup', category:'Beauty & Salon' }, { name:'Makeup Artist', category:'Beauty & Salon' },
    { name:'Mehndi Artist', category:'Beauty & Salon' }, { name:'Nail Art', category:'Beauty & Salon' },
    { name:'Eyebrow Threading', category:'Beauty & Salon' },
    // Fitness & Wellness
    { name:'Yoga Classes', category:'Fitness' }, { name:'Personal Trainer', category:'Fitness' },
    { name:'Zumba Classes', category:'Fitness' }, { name:'Gym', category:'Fitness' },
    { name:'Aerobics', category:'Fitness' }, { name:'Meditation Coach', category:'Fitness' },
    // Spa & Massage
    { name:'Spa', category:'Wellness' }, { name:'Body Massage', category:'Wellness' },
    { name:'Head Massage', category:'Wellness' }, { name:'Physiotherapy', category:'Wellness' },
    // Health & Medical
    { name:'Dietitian', category:'Health' }, { name:'Nurse at Home', category:'Health' },
    { name:'Ayurveda', category:'Health' }, { name:'Homeopathy', category:'Health' },
    // Events & Photography
    { name:'Photography', category:'Events' }, { name:'Videography', category:'Events' },
    { name:'Event Planner', category:'Events' }, { name:'Wedding Planner', category:'Events' },
    { name:'Birthday Decoration', category:'Events' }, { name:'DJ Services', category:'Events' },
    { name:'Tent & Mandap', category:'Events' }, { name:'Flower Decoration', category:'Events' },
    // Repair Services
    { name:'Mobile Repair', category:'Repair' }, { name:'Laptop Repair', category:'Repair' },
    { name:'TV Repair', category:'Repair' }, { name:'Refrigerator Repair', category:'Repair' },
    { name:'Washing Machine Repair', category:'Repair' }, { name:'Inverter & Battery', category:'Repair' },
    // Automotive
    { name:'Car Service', category:'Automotive' }, { name:'Bike Service', category:'Automotive' },
    { name:'Car Wash', category:'Automotive' }, { name:'Driving School', category:'Automotive' },
    { name:'Auto Mechanic', category:'Automotive' }, { name:'Tyre Puncture', category:'Automotive' },
    // Clothing & Fashion
    { name:'Tailor', category:'Fashion' }, { name:'Boutique', category:'Fashion' },
    { name:'Blouse Stitching', category:'Fashion' }, { name:'Embroidery', category:'Fashion' },
    { name:'Laundry & Dry Cleaning', category:'Fashion' },
    // Pet Care
    { name:'Dog Grooming', category:'Pet Care' }, { name:'Pet Boarding', category:'Pet Care' },
    { name:'Dog Walker', category:'Pet Care' }, { name:'Vet at Home', category:'Pet Care' },
    // Cleaning
    { name:'Sofa Cleaning', category:'Cleaning' }, { name:'Carpet Cleaning', category:'Cleaning' },
    { name:'Kitchen Deep Clean', category:'Cleaning' }, { name:'Bathroom Cleaning', category:'Cleaning' },
    // IT & Tech
    { name:'Web Developer', category:'IT' }, { name:'Computer Repair', category:'IT' },
    { name:'Data Recovery', category:'IT' }, { name:'CCTV Installation', category:'IT' },
    // Transport
    { name:'Packers & Movers', category:'Transport' }, { name:'Mini Tempo', category:'Transport' },
    // Legal & Finance
    { name:'Chartered Accountant', category:'Finance' }, { name:'Tax Consultant', category:'Finance' },
    { name:'Lawyer', category:'Legal' }, { name:'Notary', category:'Legal' },
    // Interior Design
    { name:'Interior Designer', category:'Interior' }, { name:'Furniture Repair', category:'Interior' },
    { name:'Curtains & Blinds', category:'Interior' },
    // Childcare
    { name:'Babysitter', category:'Childcare' }, { name:'Creche', category:'Childcare' },
    { name:'Nanny', category:'Childcare' },
  ];
  filteredServices = computed(() => {
    const v = this.q.trim().toLowerCase();
    return this.services.filter(s => s.name.toLowerCase().includes(v)).slice(0, 8);
  });

  constructor() {}

  ngOnInit() {
    this.location = this.initialLocation();
    this.recentSearches.set(this.read(RECENT_KEY));
    this.recentLocations.set(this.read(RECENT_LOC_KEY));
    this.rotTimer = setInterval(() => this.placeholderIdx.update(i => i + 1), 2800);
  }

  ngOnDestroy() { clearInterval(this.rotTimer); clearTimeout(this.blurTimer); }

  closeSoon(which: 'loc' | 'svc') {
    this.blurTimer = setTimeout(() => {
      if (which === 'loc') this.locOpen.set(false); else this.svcOpen.set(false);
    }, 150);
  }

  pickLocation(l: string) { this.location = l; this.locOpen.set(false); this.pushRecent(RECENT_LOC_KEY, l, this.recentLocations); }
  pickService(s: string)  { this.q = s; this.svcOpen.set(false); this.go(); }

  go() {
    const q = this.q.trim();
    if (q) this.pushRecent(RECENT_KEY, q, this.recentSearches);
    if (this.location.trim()) this.pushRecent(RECENT_LOC_KEY, this.location.trim(), this.recentLocations);
    this.svcOpen.set(false); this.locOpen.set(false);
    this.searchSubmit.emit({ location: this.location.trim(), q });
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
