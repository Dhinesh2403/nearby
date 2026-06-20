// src/app/core/auth/jwt.interceptor.ts
import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject }    from '@angular/core';
import { catchError, switchMap, throwError } from 'rxjs';
import { AuthService } from './auth.service';

export const jwtInterceptor: HttpInterceptorFn = (req, next) => {
  const auth  = inject(AuthService);
  const token = auth.getAccessToken();

  // Attach token to every request (if available)
  const authReq = token
    ? req.clone({ setHeaders: { Authorization: `Bearer ${token}` } })
    : req;

  return next(authReq).pipe(
    catchError((error: HttpErrorResponse) => {
      // Account deactivated mid-session → log out immediately (don't refresh).
      // Auth routes are skipped: the login page shows the message itself.
      if (error.status === 403 && error.error?.code === 'ACCOUNT_DEACTIVATED'
          && !req.url.includes('/auth/')) {
        auth.forceLogout(error.error?.message);
        return throwError(() => error);
      }

      // 401 on a non-auth route → try to refresh the token silently
      if (error.status === 401 && !req.url.includes('/auth/')) {
        return auth.refreshToken().pipe(
          switchMap(() => {
            // Retry original request with new token
            const retried = req.clone({
              setHeaders: { Authorization: `Bearer ${auth.getAccessToken()}` }
            });
            return next(retried);
          })
        );
      }
      return throwError(() => error);
    })
  );
};


// ─────────────────────────────────────────────────────────────
// src/app/core/auth/auth.guard.ts
// ─────────────────────────────────────────────────────────────
import { CanActivateFn, Router } from '@angular/router';

export const authGuard: CanActivateFn = () => {
  const auth   = inject(AuthService);
  const router = inject(Router);
  if (auth.isLoggedIn()) return true;
  router.navigate(['/auth/login']);
  return false;
};

export const adminGuard: CanActivateFn = () => {
  const auth   = inject(AuthService);
  const router = inject(Router);
  if (auth.userRole() === 'admin') return true;
  router.navigate(['/']);
  return false;
};

// nonAdminGuard — allows everyone EXCEPT admins (e.g. Browse).
// Admins are redirected to their own panel.
export const nonAdminGuard: CanActivateFn = () => {
  const auth   = inject(AuthService);
  const router = inject(Router);
  if (auth.userRole() === 'admin') { router.navigate(['/admin']); return false; }
  return true;
};

// roleGuard — restrict a route to one or more roles.
// Usage: canActivate: [roleGuard('customer')]  or  roleGuard('customer','provider')
// Sends a logged-out user to login, and a logged-in user with the wrong
// role to their own home (admins → /admin, others → landing page).
export const roleGuard = (...roles: Array<'customer' | 'provider' | 'admin'>): CanActivateFn =>
  () => {
    const auth   = inject(AuthService);
    const router = inject(Router);
    const role   = auth.userRole();

    if (!role) { router.navigate(['/auth/login']); return false; }
    if (roles.includes(role)) return true;

    // Logged in but not permitted — bounce to a page they can use.
    router.navigate([role === 'admin' ? '/admin' : '/']);
    return false;
  };
