import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { AirQualitySeriesDto } from '../models';

@Injectable({ providedIn: 'root' })
export class AirQualityApiService {
  private readonly baseUrl = '/api/air-quality';

  constructor(private http: HttpClient) {}
  live(locationId: string): Observable<AirQualitySeriesDto> {
    return this.http.post<AirQualitySeriesDto>(
      `${this.baseUrl}/live/${encodeURIComponent(locationId)}/last24h`,
      null
    );
  }

  history(locationId: string): Observable<AirQualitySeriesDto> {
    return this.http.get<AirQualitySeriesDto>(
      `${this.baseUrl}/history/${encodeURIComponent(locationId)}/last24h`
    );
  }
}
