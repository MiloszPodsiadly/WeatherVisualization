package com.milosz.podsiadly.backend.dto;
import java.time.Instant;
public record WeatherPointDto(
        Instant recordedAt, Double temperature, Double humidity, Double pressure,
        Double windSpeed, Double windDirection, Double precipitation, Double cloudCover
) {}
