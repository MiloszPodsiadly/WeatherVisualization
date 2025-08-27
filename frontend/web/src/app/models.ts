export interface LocationDto {
  id: string;
  name: string;
  admin?: string;
  country?: string;
  latitude: number;
  longitude: number;
}

export interface WeatherPointDto {
  recordedAt: string;

  temperature?: number | null;
  humidity?: number | null;
  pressure?: number | null;
  windSpeed?: number | null;
  windDirection?: number | null;
  precipitation?: number | null;
  cloudCover?: number | null;
  pm10?: number | null;
  pm2_5?: number | null;
}

export interface WeatherCurrentDto {
  location: LocationDto;
  data: WeatherPointDto;
  source: string;
}

export interface WeatherHistoryResponseDto {
  location: LocationDto;
  interval: string;
  points: WeatherPointDto[];
  source: string;
}
export interface AirQualityPointDto {
  time: string;
  pm10?: number | null;
  pm25?: number | null;
  co?: number | null;
  co2?: number | null;
  no2?: number | null;
  so2?: number | null;
  o3?: number | null;
  ch4?: number | null;
  uv?: number | null;
}

export interface AirQualityAveragesDto {
  pm10?: number | null; pm25?: number | null;
  co?: number | null;   co2?: number | null;
  no2?: number | null;  so2?: number | null;
  o3?: number | null;   ch4?: number | null;
  uv?: number | null;
}

export interface AirQualitySeriesDto {
  averages: AirQualityAveragesDto;
  points: AirQualityPointDto[];
}
