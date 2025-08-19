package com.milosz.podsiadly.backend.entity;

import lombok.*;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;
import org.springframework.data.mongodb.core.index.Indexed;

import java.time.Instant;

@Document(collection = "weather_measurements")
@Getter @Setter
@NoArgsConstructor @AllArgsConstructor @Builder
public class WeatherMeasurement {

    @Id
    private String id;

    @Indexed
    private String locationId;      // referencja do Location._id

    @Indexed
    private Instant recordedAt;     // znacznik czasu próbki (UTC)

    private Double temperature;     // °C
    private Double humidity;        // %
    private Double pressure;        // hPa
    private Double windSpeed;       // m/s
    private Double windDirection;   // stopnie (0–360)
    private Double precipitation;   // mm
    private Double cloudCover;      // %

    private String source;          // np. "OPEN_METEO"
}
