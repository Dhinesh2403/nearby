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
