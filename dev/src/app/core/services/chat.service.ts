// src/app/core/services/chat.service.ts
import { Injectable, inject, signal } from '@angular/core';
import { Observable, Subscription } from 'rxjs';
import { map } from 'rxjs/operators';
import { ApiService, ApiResponse, SocketService } from './api.service';
import { AuthService }  from '../auth/auth.service';
import { ToastService } from './toast.service';

export interface ChatSummary {
  _id:       string;
  otherName: string;
  lastText:  string;
  lastAt:    string;
  unread:    number;
}
export interface ChatMessage {
  _id:        string;
  conversationId: string;
  senderId:   string;
  senderName: string;
  text:       string;
  image?:     string;
  isRead?:    boolean;
  createdAt:  string;
}

@Injectable({ providedIn: 'root' })
export class ChatService {
  private api    = inject(ApiService);
  private socket = inject(SocketService);
  private auth   = inject(AuthService);
  private toast  = inject(ToastService);

  readonly conversations = signal<ChatSummary[]>([]);
  readonly unreadTotal   = signal<number>(0);
  private timer: any = null;
  private sub?: Subscription;
  private activeConvId = '';   // the conversation currently open on screen (if any)

  // Called by the chat thread component so we can suppress its own toasts
  enterConversation(id: string) { this.activeConvId = id; }
  leaveConversation(id: string) { if (this.activeConvId === id) this.activeConvId = ''; }

  // Open (find or create) a conversation, returns its id + other name
  open(payload: { providerId?: string; customerId?: string }): Observable<{ _id: string; otherName: string }> {
    return this.api.post<ApiResponse<{ _id: string; otherName: string }>>('/chats/open', payload)
      .pipe(map(r => r.data));
  }

  // Open (find or create) a support conversation. A customer/provider passes no
  // argument to reach the admin; an admin passes the target user's id.
  openSupport(userId?: string): Observable<{ _id: string; otherName: string }> {
    return this.api.post<ApiResponse<{ _id: string; otherName: string }>>('/chats/support', userId ? { userId } : {})
      .pipe(map(r => r.data));
  }

  // Admin: open (find or create) a support conversation with the user who raised a complaint.
  openComplaintChat(complaintId: string): Observable<{ _id: string; otherName: string }> {
    return this.api.post<ApiResponse<{ _id: string; otherName: string }>>(`/complaints/${complaintId}/chat`, {})
      .pipe(map(r => r.data));
  }

  loadList() {
    this.api.get<ApiResponse<ChatSummary[]>>('/chats').subscribe({
      next: res => this.conversations.set(res.data ?? []),
      error: () => {},
    });
  }

  loadMessages(id: string): Observable<{ messages: ChatMessage[]; otherName: string }> {
    return this.api.get<ApiResponse<{ messages: ChatMessage[]; otherName: string }>>(`/chats/${id}/messages`)
      .pipe(map(r => r.data));
  }

  send(id: string, text: string, image = ''): Observable<ApiResponse<ChatMessage>> {
    return this.api.post<ApiResponse<ChatMessage>>(`/chats/${id}/messages`, { text, image });
  }

  refreshUnread() {
    this.api.get<ApiResponse<{ total: number }>>('/chats/unread-count').subscribe({
      next: res => this.unreadTotal.set(res.data?.total ?? 0),
      error: () => {},
    });
  }

  start() {
    this.stop();
    this.refreshUnread();

    // Live updates: connect socket, join personal room, refresh on each push
    const token = this.auth.getAccessToken();
    const uid   = this.auth.currentUser()?._id;
    if (token && uid) {
      this.socket.connect(token);
      this.socket.joinUserRoom(uid);
      this.sub = this.socket.onChatNew().subscribe((p: any) => {
        const viewing = p?.conversationId && p.conversationId === this.activeConvId;
        if (!viewing) {
          // Bump the badge instantly, then reconcile with the server
          this.unreadTotal.update(n => n + 1);
          this.toast.info(`New message${p?.from ? ' from ' + p.from : ''}${p?.preview ? ': ' + p.preview : ''}`);
        }
        this.refreshUnread();
        this.loadList();   // keep the My Chats list fresh too
      });
    }

    // Poll as a fallback (e.g. if the socket drops)
    this.timer = setInterval(() => this.refreshUnread(), 20000);
  }

  stop() {
    if (this.timer) { clearInterval(this.timer); this.timer = null; }
    this.sub?.unsubscribe();
    this.sub = undefined;
    this.unreadTotal.set(0);
    this.conversations.set([]);
  }
}
