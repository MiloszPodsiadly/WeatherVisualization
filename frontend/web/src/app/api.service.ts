import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';

@Injectable({ providedIn: 'root' })
export class ApiService {
  private base = 'http://localhost:8080';

  constructor(private http: HttpClient) {}

  me() {
    return this.http.get<any>(`${this.base}/api/me`, { withCredentials: true });
  }

  logout() {
    return this.http.post(`${this.base}/logout`, {}, { withCredentials: true });
  }
}
