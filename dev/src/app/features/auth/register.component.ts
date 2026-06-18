// src/app/features/auth/register.component.ts
// Registration is now phone OTP — redirect straight to the login/signup page.
import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';

@Component({ selector: 'app-register', standalone: true, imports: [], template: '' })
export class RegisterComponent implements OnInit {
  constructor(private router: Router) {}
  ngOnInit() { this.router.navigate(['/auth/login'], { replaceUrl: true }); }
}
