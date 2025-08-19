import { Injectable, inject } from '@angular/core';
import { BehaviorSubject, Observable, of, tap, catchError } from 'rxjs';
import { Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';

export interface MeDto {
  displayName?: string;
  email?: string;
  authenticated?: boolean;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private http = inject(HttpClient);
  private router = inject(Router);

  private _me$ = new BehaviorSubject<MeDto | null>(null);
  me$ = this._me$.asObservable();
  isLoggedIn$ = this.me$.pipe(tap());

  refreshMe(): Observable<MeDto | null> {
    return this.http.get<MeDto>('/api/me').pipe(
      tap(me => {
        this._me$.next(me);
        if (me?.displayName) localStorage.setItem('userName', me.displayName);
      }),
      catchError(() => { this._me$.next(null); return of(null); })
    );
  }

  loginGithub(returnUrl = '/welcome') {
    localStorage.setItem('returnUrl', returnUrl);
    location.href = 'http://localhost:8080/oauth2/authorization/github';  // 👈 direct to backend
  }

  loginGoogle(returnUrl = '/welcome') {
    localStorage.setItem('returnUrl', returnUrl);
    location.href = 'http://localhost:8080/oauth2/authorization/google';  // 👈 direct to backend
  }


  logout() {
    return this.http.post('/logout', {}, { responseType: 'text' as const }) // ⬅ no /api
      .pipe(/* unchanged tap/catchError */);
  }

  afterOAuthRedirect() {
    this.refreshMe().subscribe(me => {
      if (me) {
        const url = localStorage.getItem('returnUrl') || '/welcome';
        this.router.navigateByUrl(url);
      }
    });
  }
}
