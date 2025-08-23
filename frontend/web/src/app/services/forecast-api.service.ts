// src/app/services/forecast-api.service.ts
import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';

export type RangeKey = 'today' | 'tomorrow' | '+2' | 'week';

export interface CitySnapshot {
  id: string;
  name: string;
  lat: number;
  lon: number;
  tMax?: number | null;
  pop?: number | null;
}

export interface PlSnapshotResponse {
  range: string;
  generatedAt: string;
  cities: CitySnapshot[];
}

export interface DailySeries {
  dates: string[];
  tmax: (number | null)[];
  pop: (number | null)[];
}

@Injectable({ providedIn: 'root' })
export class ForecastApiService {
  private http = inject(HttpClient);

  plSnapshot(range: RangeKey | string = 'today') {
    const params = new HttpParams().set('range', String(range));
    return this.http.get<PlSnapshotResponse>('/api/forecast/pl-snapshot', { params });
  }

  daily(lat: number, lon: number, days = 7) {
    const params = new HttpParams().set('lat', lat).set('lon', lon).set('days', days);
    return this.http.get<DailySeries>('/api/forecast/daily', { params });
  }
}
