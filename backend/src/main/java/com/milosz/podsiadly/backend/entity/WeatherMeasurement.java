package com.milosz.podsiadly.backend.entity;

import lombok.*;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.Instant;

@Document(collection = "weather_measurements")
@Getter @Setter
@NoArgsConstructor @AllArgsConstructor @Builder
public class WeatherMeasurement {

    @Id
    private String id;

    @Indexed
    private String locationId;

    @Indexed
    private Instant recordedAt;

    private Double temperature;
    private Double humidity;
    private Double pressure;
    private Double windSpeed;
    private Double windDirection;
    private Double precipitation;
    private Double cloudCover;
    private Double pm10;
    private Double pm2_5;
    private String source;
}
