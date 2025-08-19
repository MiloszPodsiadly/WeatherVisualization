import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { WeatherCurrentDto, WeatherHistoryResponseDto } from '../models';

@Injectable({ providedIn: 'root' })
export class WeatherApiService {
  constructor(private http: HttpClient) {}

  current(locationId: string) {
    const params = new HttpParams().set('locationId', locationId);
    return this.http.get<WeatherCurrentDto>('/api/weather/current', { params });
  }

  history(locationId: string, from: string, to: string, interval = '1h') {
    const params = new HttpParams()
      .set('locationId', locationId)
      .set('from', from)
      .set('to', to)
      .set('interval', interval);
    return this.http.get<WeatherHistoryResponseDto>('/api/weather/history', { params });
  }
}
