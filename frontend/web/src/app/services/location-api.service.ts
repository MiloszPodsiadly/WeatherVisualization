import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { LocationDto } from '../models';
import { Observable } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class LocationApiService {
  constructor(private http: HttpClient) {}

  search(query: string, count = 5): Observable<LocationDto[]> {
    const params = new HttpParams()
      .set('query', query)
      .set('count', String(count));
    return this.http.get<LocationDto[]>('/api/locations/search', { params });
  }
}
