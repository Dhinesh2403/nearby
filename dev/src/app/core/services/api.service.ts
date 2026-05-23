// src/app/core/services/api.service.ts
// All HTTP calls to the Node.js backend go through this service.
import { Injectable }          from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable }          from 'rxjs';
import { environment }         from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class ApiService {
  private readonly BASE = environment.apiUrl;

  constructor(private http: HttpClient) {}

  get<T>(path: string, params?: Record<string, any>): Observable<T> {
    const httpParams = params
      ? new HttpParams({ fromObject: params as Record<string, string> })
      : undefined;
    return this.http.get<T>(`${this.BASE}${path}`, { params: httpParams });
  }

  post<T>(path: string, body: any): Observable<T> {
    return this.http.post<T>(`${this.BASE}${path}`, body);
  }

  put<T>(path: string, body: any): Observable<T> {
    return this.http.put<T>(`${this.BASE}${path}`, body);
  }

  delete<T>(path: string): Observable<T> {
    return this.http.delete<T>(`${this.BASE}${path}`);
  }
}

// ─────────────────────────────────────────────────────────────
// Provider model interface
// ─────────────────────────────────────────────────────────────
export interface Provider {
  _id:          string;
  userId:       any;
  businessName: string;
  tagline:      string;
  bio:          string;
  category:     string;
  subCategory:  string;
  skills:       string[];
  images:       string[];
  experience:   number;
  isVerified:   boolean;
  isOnline:     boolean;
  ratingAvg:    number;
  ratingCount:  number;
  totalBookings:number;
  price:        number;
  status:       string;
  availability: { days: string[]; startTime: string; endTime: string };
}

export interface Booking {
  _id:           string;
  customerId:    any;
  providerId:    any;
  serviceId:     any;
  bookingType:   string;
  scheduledDate: string;
  scheduledTime: string;
  address:       string;
  meetingLink:   string;
  status:        string;
  notes:         string;
  createdAt:     string;
}

export interface ApiResponse<T> {
  success:  boolean;
  message:  string;
  data:     T;
}

export interface PaginatedResponse<T> {
  success:    boolean;
  count:      number;
  data:       T[];
  pagination: { total: number; page: number; limit: number; pages: number };
}


// ─────────────────────────────────────────────────────────────
// src/app/core/services/toast.service.ts
// Global toast notifications — inject anywhere and call show()
// ─────────────────────────────────────────────────────────────
import { signal } from '@angular/core';

export interface Toast {
  id:      number;
  message: string;
  type:    'success' | 'error' | 'info';
}

@Injectable({ providedIn: 'root' })
export class ToastService {
  toasts = signal<Toast[]>([]);
  private next = 0;

  show(message: string, type: Toast['type'] = 'success', duration = 3500) {
    const id = ++this.next;
    this.toasts.update(t => [...t, { id, message, type }]);
    setTimeout(() => this.toasts.update(t => t.filter(x => x.id !== id)), duration);
  }

  success(msg: string) { this.show(msg, 'success'); }
  error(msg: string)   { this.show(msg, 'error'); }
  info(msg: string)    { this.show(msg, 'info'); }
}


// ─────────────────────────────────────────────────────────────
// src/app/core/services/socket.service.ts
// Wraps Socket.io — connect after login, disconnect on logout
// ─────────────────────────────────────────────────────────────
import { OnDestroy } from '@angular/core';
import { io, Socket } from 'socket.io-client';

@Injectable({ providedIn: 'root' })
export class SocketService implements OnDestroy {
  private socket: Socket | null = null;

  connect(token: string) {
    if (this.socket?.connected) return;
    this.socket = io(environment.socketUrl, {
      auth:                { token },
      reconnectionAttempts:  5,
      reconnectionDelay:     2000,
    });
    this.socket.on('connect',       () => console.log('🟢 Socket connected'));
    this.socket.on('disconnect',    () => console.log('🔴 Socket disconnected'));
    this.socket.on('connect_error', (e: any) => console.warn('Socket error', e.message));
  }

  disconnect() { this.socket?.disconnect(); this.socket = null; }

  emit(event: string, data: any) { this.socket?.emit(event, data); }

  on<T>(event: string): Observable<T> {
    return new Observable(obs => {
      this.socket?.on(event, (d: T) => obs.next(d));
      return () => this.socket?.off(event);
    });
  }

  joinRoom(bookingId: string, userId: string) { this.emit('join_room', { bookingId, userId }); }
  sendMsg(bookingId: string, senderId: string, senderName: string, text: string) {
    this.emit('send_message', { bookingId, senderId, senderName, text });
  }
  onMessage()       { return this.on<any>('receive_message'); }
  onBookingUpdate() { return this.on<any>('booking_update');  }

  ngOnDestroy() { this.disconnect(); }
}
