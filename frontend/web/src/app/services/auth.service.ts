import { Injectable, inject } from '@angular/core';
import { BehaviorSubject, Observable, of } from 'rxjs';
import { tap, catchError, finalize } from 'rxjs/operators';
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
  isLoggedIn$ = this.me$;

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
    location.href = 'http://localhost:8080/oauth2/authorization/github';
  }

  loginGoogle(returnUrl = '/welcome') {
    localStorage.setItem('returnUrl', returnUrl);
    location.href = 'http://localhost:8080/oauth2/authorization/google';
  }

  logout(): Observable<string | null> {
    return this.http.post('/logout', {}, { responseType: 'text' as const }).pipe(
      tap(() => {
        this._me$.next(null);
        localStorage.removeItem('userName');
        localStorage.removeItem('returnUrl');
      }),
      catchError(() => of(null)),
      finalize(() => {
        window.location.replace('/');
      })
    );
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
