// src/app/features/chat/chat.component.ts
import { Component, OnInit, OnDestroy, signal, ViewChild, ElementRef, AfterViewChecked } from '@angular/core';
import { CommonModule }  from '@angular/common';
import { FormsModule }   from '@angular/forms';
import { RouterLink, ActivatedRoute } from '@angular/router';
import { AuthService }   from '../../core/auth/auth.service';
import { SocketService } from '../../core/services/api.service';
import { ChatService }   from '../../core/services/chat.service';
import { Subscription }  from 'rxjs';

interface Msg { id:string; senderId:string; senderName:string; text:string; image?:string; ts:Date; mine:boolean; seen?:boolean; }

@Component({
  selector: 'app-chat',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  template: `
    <div class="chat-wrap">
      <!-- Header -->
      <div class="chat-hdr">
        <div class="container d-flex align-items-center gap-3">
          <a [routerLink]="backLink" class="back-btn"><i class="bi bi-arrow-left"></i></a>
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
                @if (m.image) {
                  <img class="bbl-img" [src]="m.image" alt="attachment" (click)="lightbox.set(m.image!)" />
                }
                @if (m.text) { <p class="bbl-txt">{{ m.text }}</p> }
                <span class="bbl-ts">
                  {{ fmtTime(m.ts) }}
                  @if (m.mine) {
                    <i class="bi ms-1" [class.bi-check2]="!m.seen" [class.bi-check2-all]="m.seen"
                       [style.color]="m.seen ? '#34B7F1' : 'rgba(255,255,255,.6)'"></i>
                  }
                </span>
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
          @if (pendingImage()) {
            <div class="img-preview">
              <img [src]="pendingImage()" alt="to send" />
              <button class="ip-del" (click)="pendingImage.set('')"><i class="bi bi-x"></i></button>
              <span class="ip-lbl">Photo ready to send</span>
            </div>
          }
          <div class="ci-inner">
            <button class="attach-btn" (click)="fi.click()" title="Attach photo / payment screenshot">
              <i class="bi bi-paperclip"></i>
            </button>
            <input #fi type="file" hidden accept="image/*" (change)="onAttach($event)" />
            <input type="text" class="ci-input" [(ngModel)]="newMsg"
                   placeholder="Type a message..." (keyup.enter)="send()" />
            <button class="send-btn" (click)="send()" [disabled]="!newMsg.trim() && !pendingImage()">
              <i class="bi bi-send-fill"></i>
            </button>
          </div>
        </div>
      </div>
    </div>

    @if (lightbox()) {
      <div class="chat-lightbox" (click)="lightbox.set(null)">
        <img [src]="lightbox()" alt="attachment" />
      </div>
    }
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
    .bbl-img { max-width:220px; max-height:260px; border-radius:12px; display:block; margin-bottom:6px; cursor:pointer; }
    .bbl-ts { display:inline-flex; align-items:center; }
    .attach-btn { background:none; border:none; color:var(--nb-text-muted); font-size:1.1rem; cursor:pointer; display:flex; align-items:center; padding:0 4px; }
    .attach-btn:hover { color:var(--nb-primary); }
    .img-preview { position:relative; display:inline-flex; align-items:center; gap:10px; background:var(--nb-surface-2); border:1px solid var(--nb-border); border-radius:12px; padding:8px 12px 8px 8px; margin-bottom:8px; }
    .img-preview img { width:48px; height:48px; object-fit:cover; border-radius:8px; }
    .ip-lbl { font-size:.8rem; color:var(--nb-text-muted); }
    .ip-del { position:absolute; top:-6px; left:42px; width:20px; height:20px; border:none; border-radius:50%; background:var(--nb-danger); color:#fff; font-size:.7rem; cursor:pointer; display:flex; align-items:center; justify-content:center; }
    .chat-lightbox { position:fixed; inset:0; background:rgba(0,0,0,.85); z-index:10000; display:flex; align-items:center; justify-content:center; padding:2rem; cursor:zoom-out; }
    .chat-lightbox img { max-width:92vw; max-height:92vh; border-radius:12px; }
  `]
})
export class ChatComponent implements OnInit, OnDestroy, AfterViewChecked {
  @ViewChild('scrollRef') scrollRef!: ElementRef;
  messages     = signal<Msg[]>([]);
  newMsg       = '';
  typing       = signal(false);
  pendingImage = signal('');
  lightbox     = signal<string | null>(null);
  otherName    = 'Conversation';
  backLink     = '/chats';
  private subs: Subscription[] = [];
  private convId = '';

  constructor(
    private route: ActivatedRoute,
    public  auth:  AuthService,
    private chat:  ChatService,
    private socket: SocketService,
  ) {}

  private get myId() { return this.auth.currentUser()?._id ?? ''; }

  ngOnInit() {
    this.convId   = this.route.snapshot.paramMap.get('conversationId') ?? '';
    this.backLink = '/chats';
    this.chat.enterConversation(this.convId);   // suppress toast/badge while viewing
    this.reload(true);

    const token = this.auth.getAccessToken() ?? '';
    this.socket.connect(token);
    this.socket.joinRoom(this.convId, this.myId);

    // Incoming message (server broadcasts the saved message to the room)
    this.subs.push(this.socket.onMessage().subscribe((m: any) => {
      if (m.conversationId && m.conversationId !== this.convId) return;
      if (m.senderId === this.myId) return;                       // ignore our own echo
      this.messages.update(msgs => [...msgs, {
        id: m._id ?? Date.now().toString(), senderId: m.senderId, senderName: m.senderName,
        text: m.text, image: m.image, ts: new Date(m.createdAt ?? Date.now()), mine: false,
      }]);
      // We're viewing → mark read (server then emits "seen" to the sender) + refresh badge
      this.chat.loadMessages(this.convId).subscribe({ next: () => this.chat.refreshUnread() });
    }));

    // The other side read our messages → flip ticks to "seen"
    this.subs.push(this.socket.onSeen().subscribe((p: any) => {
      if (p.by === this.myId) return;
      this.messages.update(msgs => msgs.map(x => x.mine ? { ...x, seen: true } : x));
    }));
  }

  private reload(initial = false) {
    this.chat.loadMessages(this.convId).subscribe({
      next: data => {
        if (data.otherName) this.otherName = data.otherName;
        this.messages.set((data.messages ?? []).map(m => ({
          id: m._id, senderId: m.senderId, senderName: m.senderName,
          text: m.text, image: m.image, ts: new Date(m.createdAt),
          mine: m.senderId === this.myId, seen: !!m.isRead,
        })));
        this.chat.refreshUnread();
      },
      error: () => { if (initial) this.messages.set([]); },
    });
  }

  ngAfterViewChecked() {
    try { const e = this.scrollRef?.nativeElement; if(e) e.scrollTop = e.scrollHeight; } catch(_) {}
  }

  onAttach(e: Event) {
    const el = e.target as HTMLInputElement;
    const f = el.files?.[0];
    if (!f) return;
    if (f.size > 5 * 1024 * 1024) { alert('Image is over 5 MB.'); el.value = ''; return; }
    const reader = new FileReader();
    reader.onload = () => this.pendingImage.set(reader.result as string);
    reader.readAsDataURL(f);
    el.value = '';
  }

  send() {
    const t   = this.newMsg.trim();
    const img = this.pendingImage();
    if ((!t && !img) || !this.convId) return;
    const user = this.auth.currentUser();
    // Optimistic bubble
    this.messages.update(msgs => [...msgs, {
      id: Date.now().toString(), senderId: this.myId, senderName: user?.name ?? 'Me',
      text: t, image: img || undefined, ts: new Date(), mine: true, seen: false,
    }]);
    // Persist; the server broadcasts to the other participant (incl. image)
    this.chat.send(this.convId, t, img).subscribe({ error: () => {} });
    this.newMsg = '';
    this.pendingImage.set('');
  }

  fmtTime(d: Date) { return d.toLocaleTimeString('en-IN', { hour:'2-digit', minute:'2-digit' }); }
  ngOnDestroy() {
    this.chat.leaveConversation(this.convId);
    this.subs.forEach(s => s.unsubscribe());
  }
}
