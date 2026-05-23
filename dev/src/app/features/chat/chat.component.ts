// src/app/features/chat/chat.component.ts
import { Component, OnInit, OnDestroy, signal, ViewChild, ElementRef, AfterViewChecked } from '@angular/core';
import { CommonModule }  from '@angular/common';
import { FormsModule }   from '@angular/forms';
import { RouterLink, ActivatedRoute } from '@angular/router';
import { AuthService }   from '../../core/auth/auth.service';
import { SocketService } from '../../core/services/api.service';
import { Subscription }  from 'rxjs';

interface Msg { id:string; senderId:string; senderName:string; text:string; ts:Date; mine:boolean; }

@Component({
  selector: 'app-chat',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  template: `
    <div class="chat-wrap">
      <!-- Header -->
      <div class="chat-hdr">
        <div class="container d-flex align-items-center gap-3">
          <a routerLink="/dashboard/customer" class="back-btn"><i class="bi bi-arrow-left"></i></a>
          <div class="ch-av">{{ otherName.charAt(0) }}</div>
          <div class="flex-grow-1">
            <p class="ch-name">{{ otherName }}</p>
            <p class="ch-meta"><span class="ondot"></span>Online · Booking chat</p>
          </div>
        </div>
      </div>

      <!-- Messages -->
      <div class="msgs-area" #scrollRef>
        <div class="container py-3">
          <div class="date-sep"><span>Today</span></div>
          @for (m of messages(); track m.id) {
            <div class="msg-row" [class.mine]="m.mine">
              @if (!m.mine) { <div class="msg-av">{{ m.senderName.charAt(0) }}</div> }
              <div class="bubble" [class.mine]="m.mine">
                <p class="bbl-txt">{{ m.text }}</p>
                <span class="bbl-ts">{{ fmtTime(m.ts) }}</span>
              </div>
            </div>
          }
          @if (typing()) {
            <div class="msg-row">
              <div class="msg-av">{{ otherName.charAt(0) }}</div>
              <div class="typing-dot"><span></span><span></span><span></span></div>
            </div>
          }
        </div>
      </div>

      <!-- Input -->
      <div class="chat-input-bar">
        <div class="container">
          <div class="ci-inner">
            <input type="text" class="ci-input" [(ngModel)]="newMsg"
                   placeholder="Type a message..." (keyup.enter)="send()" />
            <button class="send-btn" (click)="send()" [disabled]="!newMsg.trim()">
              <i class="bi bi-send-fill"></i>
            </button>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .chat-wrap { display:flex; flex-direction:column; height:calc(100vh - 65px); background:var(--nb-bg); }
    .chat-hdr { background:#fff; border-bottom:1px solid var(--nb-border); padding:12px 0; flex-shrink:0; box-shadow:var(--shadow-sm); }
    .back-btn { width:36px; height:36px; background:var(--nb-surface-2); border-radius:50%; display:flex; align-items:center; justify-content:center; color:var(--nb-text); text-decoration:none; }
    .ch-av    { width:40px; height:40px; background:var(--nb-primary); border-radius:50%; display:flex; align-items:center; justify-content:center; font-family:var(--font-display); font-weight:800; color:#fff; font-size:1rem; }
    .ch-name  { font-family:var(--font-display); font-weight:700; font-size:.95rem; margin:0; }
    .ch-meta  { font-size:.72rem; color:var(--nb-text-muted); margin:0; display:flex; align-items:center; gap:4px; }
    .ondot    { width:7px; height:7px; border-radius:50%; background:var(--nb-success); display:inline-block; }
    .msgs-area { flex:1; overflow-y:auto; }
    .date-sep { text-align:center; margin:16px 0; position:relative; }
    .date-sep::before { content:''; position:absolute; top:50%; left:0; right:0; height:1px; background:var(--nb-border); }
    .date-sep span { background:var(--nb-bg); padding:0 12px; font-size:.72rem; font-weight:600; color:var(--nb-text-muted); position:relative; font-family:var(--font-display); text-transform:uppercase; letter-spacing:.06em; }
    .msg-row  { display:flex; align-items:flex-end; gap:8px; margin-bottom:10px; }
    .msg-row.mine { flex-direction:row-reverse; }
    .msg-av   { width:28px; height:28px; min-width:28px; background:var(--nb-primary); border-radius:50%; display:flex; align-items:center; justify-content:center; font-family:var(--font-display); font-size:.72rem; font-weight:700; color:#fff; }
    .bubble   { max-width:65%; background:#fff; border:1px solid var(--nb-border); border-radius:18px 18px 18px 4px; padding:10px 14px; box-shadow:var(--shadow-sm); }
    .bubble.mine { background:var(--nb-primary); border:none; border-radius:18px 18px 4px 18px; }
    .bbl-txt  { margin:0 0 4px; font-size:.875rem; line-height:1.5; color:var(--nb-text); }
    .bubble.mine .bbl-txt { color:#fff; }
    .bbl-ts   { font-size:.65rem; color:var(--nb-text-muted); }
    .bubble.mine .bbl-ts { color:rgba(255,255,255,.6); }
    .typing-dot { background:#fff; border:1px solid var(--nb-border); border-radius:18px 18px 18px 4px; padding:12px 16px; display:flex; align-items:center; gap:4px; }
    .typing-dot span { width:7px; height:7px; background:var(--nb-text-muted); border-radius:50%; animation:blink 1.2s infinite; }
    .typing-dot span:nth-child(2) { animation-delay:.2s; }
    .typing-dot span:nth-child(3) { animation-delay:.4s; }
    @keyframes blink { 0%,80%,100%{ opacity:.3; transform:scale(.8); } 40%{ opacity:1; transform:scale(1); } }
    .chat-input-bar { background:#fff; border-top:1px solid var(--nb-border); padding:12px 0; flex-shrink:0; }
    .ci-inner { display:flex; align-items:center; gap:8px; background:var(--nb-bg); border:1.5px solid var(--nb-border); border-radius:var(--radius-xl); padding:8px 8px 8px 16px; }
    .ci-input { flex:1; border:none; outline:none; background:transparent; font-family:var(--font-body); font-size:.9rem; }
    .ci-input::placeholder { color:var(--nb-text-light); }
    .send-btn { width:36px; height:36px; background:var(--nb-primary); border:none; border-radius:50%; color:#fff; cursor:pointer; display:flex; align-items:center; justify-content:center; transition:all .2s; }
    .send-btn:hover:not(:disabled) { background:var(--nb-primary-light); }
    .send-btn:disabled { opacity:.4; cursor:not-allowed; }
  `]
})
export class ChatComponent implements OnInit, OnDestroy, AfterViewChecked {
  @ViewChild('scrollRef') scrollRef!: ElementRef;
  messages = signal<Msg[]>([
    { id:'1', senderId:'sys', senderName:'Rajan', text:'Hello! I received your booking request. I can come as scheduled.', ts:new Date(Date.now()-600000), mine:false },
    { id:'2', senderId:'me',  senderName:'Me',    text:'Great! Please bring the necessary tools.', ts:new Date(Date.now()-300000), mine:true },
    { id:'3', senderId:'sys', senderName:'Rajan', text:'Will do! See you then. 🔧', ts:new Date(Date.now()-60000), mine:false },
  ]);
  newMsg    = '';
  typing    = signal(false);
  otherName = 'Rajan Plumbing Works';
  private sub?: Subscription;
  private bookingId = '';

  constructor(private route: ActivatedRoute, public auth: AuthService, private socket: SocketService) {}

  ngOnInit() {
    this.bookingId = this.route.snapshot.paramMap.get('bookingId') ?? 'demo';
    const token = this.auth.getAccessToken() ?? '';
    this.socket.connect(token);
    this.socket.joinRoom(this.bookingId, this.auth.currentUser()?._id ?? '');
    this.sub = this.socket.onMessage().subscribe((m: any) => {
      if (m.senderId !== this.auth.currentUser()?._id) {
        const msg: Msg = { id:Date.now().toString(), senderId:m.senderId, senderName:m.senderName, text:m.text, ts:new Date(m.timestamp), mine:false };
        this.messages.update(msgs => [...msgs, msg]);
      }
    });
  }

  ngAfterViewChecked() {
    try { const e = this.scrollRef?.nativeElement; if(e) e.scrollTop = e.scrollHeight; } catch(_) {}
  }

  send() {
    const t = this.newMsg.trim();
    if (!t) return;
    const user = this.auth.currentUser();
    const msg: Msg = { id:Date.now().toString(), senderId:user?._id??'me', senderName:user?.name??'Me', text:t, ts:new Date(), mine:true };
    this.messages.update(msgs => [...msgs, msg]);
    this.socket.sendMsg(this.bookingId, user?._id??'me', user?.name??'Me', t);
    this.newMsg = '';
    // Simulate reply in demo mode
    if (this.bookingId === 'demo-booking') {
      this.typing.set(true);
      setTimeout(() => {
        this.typing.set(false);
        const reply: Msg = { id:(Date.now()+1).toString(), senderId:'sys', senderName:this.otherName, text:'Understood! I will keep that in mind.', ts:new Date(), mine:false };
        this.messages.update(msgs => [...msgs, reply]);
      }, 1500);
    }
  }

  fmtTime(d: Date) { return d.toLocaleTimeString('en-IN', { hour:'2-digit', minute:'2-digit' }); }
  ngOnDestroy() { this.sub?.unsubscribe(); }
}
