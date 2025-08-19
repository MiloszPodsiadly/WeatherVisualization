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
  temperature?: number;
  humidity?: number;
  pressure?: number;
  windSpeed?: number;
  windDirection?: number;
  precipitation?: number;
  cloudCover?: number;
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

