package com.milosz.podsiadly.backend.mapper;

import com.milosz.podsiadly.backend.dto.WeatherPointDto;
import com.milosz.podsiadly.backend.entity.WeatherMeasurement;
import org.springframework.stereotype.Component;

@Component
public class WeatherMeasurementMapper {

    public WeatherPointDto toDto(WeatherMeasurement m) {
        if (m == null) return null;
        return new WeatherPointDto(
                m.getRecordedAt(),
                m.getTemperature(),
                m.getHumidity(),
                m.getPressure(),
                m.getWindSpeed(),
                m.getWindDirection(),
                m.getPrecipitation(),
                m.getCloudCover()
        );
    }

    public WeatherMeasurement toDoc(WeatherPointDto p, String locationId, String source) {
        if (p == null) return null;
        return WeatherMeasurement.builder()
                .locationId(locationId)
                .recordedAt(p.recordedAt())
                .temperature(p.temperature())
                .humidity(p.humidity())
                .pressure(p.pressure())
                .windSpeed(p.windSpeed())
                .windDirection(p.windDirection())
                .precipitation(p.precipitation())
                .cloudCover(p.cloudCover())
                .source(source)
                .build();
    }
}
