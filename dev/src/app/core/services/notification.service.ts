// src/app/core/services/notification.service.ts
// Holds the current user's in-app notifications, with live socket push + polling.
import { Injectable, computed, inject, signal } from '@angular/core';
import { Subscription } from 'rxjs';
import { ApiService, ApiResponse, SocketService } from './api.service';
import { AuthService }  from '../auth/auth.service';
import { ToastService } from './toast.service';

export interface NotificationItem {
  _id:       string;
  type:      string;
  title:     string;
  body:      string;
  link:      string;
  isRead:    boolean;
  createdAt: string;
}

@Injectable({ providedIn: 'root' })
export class NotificationService {
  private api    = inject(ApiService);
  private socket = inject(SocketService);
  private auth   = inject(AuthService);
  private toast  = inject(ToastService);

  readonly notifications = signal<NotificationItem[]>([]);
  readonly unread = computed(() => this.notifications().filter(n => !n.isRead).length);

  private timer: any = null;
  private sub?: Subscription;
  private deSub?: Subscription;

  // Fetch the latest notifications for the logged-in user.
  // Chat messages have their own indicator, so exclude type 'message'.
  load() {
    this.api.get<ApiResponse<NotificationItem[]>>('/notifications').subscribe({
      next: res => this.notifications.set((res.data ?? []).filter(n => n.type !== 'message')),
      error: () => { /* silent — bell just stays empty */ },
    });
  }

  // Mark everything as read (no per-item endpoint exists)
  markAllRead() {
    if (this.unread() === 0) return;
    // Optimistic UI update
    this.notifications.update(list => list.map(n => ({ ...n, isRead: true })));
    this.api.put('/notifications/read-all', {}).subscribe({ error: () => this.load() });
  }

  // Begin live updates + polling after login
  start() {
    this.stop();
    this.load();

    const token = this.auth.getAccessToken();
    const uid   = this.auth.currentUser()?._id;
    if (token && uid) {
      this.socket.connect(token);
      this.socket.joinUserRoom(uid);
      this.sub = this.socket.onNotifyNew().subscribe((p: any) => {
        // Bump the bell badge instantly, toast, then reconcile with the server
        this.notifications.update(list => [{
          _id: 'tmp' + Date.now(), type: p?.type || 'info',
          title: p?.title || 'Notification', body: p?.body || '',
          link: p?.link || '', isRead: false, createdAt: new Date().toISOString(),
        }, ...list]);
        this.toast.info(p?.title ? `${p.title}${p?.body ? ' — ' + p.body : ''}` : 'New notification');
        this.load();
      });

      // Admin deactivated this account → log out of the live session right away.
      this.deSub = this.socket.onDeactivated().subscribe((p: any) => {
        this.auth.forceLogout(p?.message);
      });
    }

    this.timer = setInterval(() => this.load(), 30000);   // fallback poll
  }

  // Stop and clear on logout
  stop() {
    if (this.timer) { clearInterval(this.timer); this.timer = null; }
    this.sub?.unsubscribe();
    this.sub = undefined;
    this.deSub?.unsubscribe();
    this.deSub = undefined;
    this.notifications.set([]);
  }
}
