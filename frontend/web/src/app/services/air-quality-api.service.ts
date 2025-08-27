import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { AirQualitySeriesDto } from '../models';

@Injectable({ providedIn: 'root' })
export class AirQualityApiService {
  private readonly baseUrl = '/api/air-quality';
  constructor(private http: HttpClient) {}

  private params(fromISO: string, toISO: string) {
    return new HttpParams().set('from', fromISO).set('to', toISO);
  }

  live(locationId: string, fromISO: string, toISO: string): Observable<AirQualitySeriesDto> {
    return this.http.post<AirQualitySeriesDto>(
      `${this.baseUrl}/live/${encodeURIComponent(locationId)}`,
      null,
      { params: this.params(fromISO, toISO) }
    );
  }

  history(locationId: string, fromISO: string, toISO: string): Observable<AirQualitySeriesDto> {
    return this.http.get<AirQualitySeriesDto>(
      `${this.baseUrl}/history/${encodeURIComponent(locationId)}`,
      { params: this.params(fromISO, toISO) }
    );
  }
}
