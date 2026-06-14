// src/app/features/chat/chats-list.component.ts
import { Component, OnInit } from '@angular/core';
import { CommonModule }  from '@angular/common';
import { RouterLink }    from '@angular/router';
import { ChatService }   from '../../core/services/chat.service';

@Component({
  selector: 'app-chats-list',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <div class="container py-4" style="max-width:720px">
      <h2 class="section-title mb-1">Messages</h2>
      <p class="section-sub mb-4">Your conversations with providers and customers</p>

      <div class="nb-card p-0">
        @if (chat.conversations().length === 0) {
          <div class="text-center py-5 text-muted-nb">
            <i class="bi bi-chat-square-text d-block mb-2" style="font-size:2rem"></i>
            No conversations yet.
          </div>
        } @else {
          @for (c of chat.conversations(); track c._id) {
            <a class="chat-row" [routerLink]="['/chat', c._id]">
              <div class="cr-av">{{ c.otherName.charAt(0).toUpperCase() }}</div>
              <div class="flex-grow-1 min-w-0">
                <div class="d-flex justify-content-between align-items-center">
                  <p class="cr-name">{{ c.otherName }}</p>
                  @if (c.lastAt) { <span class="cr-time">{{ c.lastAt | date:'dd MMM, h:mm a' }}</span> }
                </div>
                <p class="cr-last" [class.unread]="c.unread > 0">{{ c.lastText || 'Start the conversation' }}</p>
              </div>
              @if (c.unread > 0) {
                <span class="cr-badge">{{ c.unread > 9 ? '9+' : c.unread }}</span>
              }
            </a>
          }
        }
      </div>
    </div>
  `,
  styles: [`
    .chat-row { display:flex; align-items:center; gap:12px; padding:14px 16px; border-bottom:1px solid var(--nb-border); text-decoration:none; color:var(--nb-text); transition:background .12s; }
    .chat-row:last-child { border-bottom:none; }
    .chat-row:hover { background:var(--nb-surface-2); }
    .cr-av { width:46px; height:46px; min-width:46px; border-radius:50%; background:var(--nb-primary); color:#fff; display:flex; align-items:center; justify-content:center; font-family:var(--font-display); font-weight:800; }
    .cr-name { font-family:var(--font-display); font-weight:700; font-size:.95rem; margin:0; }
    .cr-time { font-size:.7rem; color:var(--nb-text-muted); white-space:nowrap; }
    .cr-last { font-size:.85rem; color:var(--nb-text-muted); margin:2px 0 0; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
    .cr-last.unread { color:var(--nb-text); font-weight:600; }
    .cr-badge { background:var(--nb-primary); color:#fff; border-radius:20px; min-width:20px; height:20px; padding:0 6px; font-size:.72rem; font-weight:700; display:flex; align-items:center; justify-content:center; font-family:var(--font-display); }
    .min-w-0 { min-width:0; }
  `]
})
export class ChatsListComponent implements OnInit {
  constructor(public chat: ChatService) {}
  ngOnInit() { this.chat.loadList(); this.chat.refreshUnread(); }
}
