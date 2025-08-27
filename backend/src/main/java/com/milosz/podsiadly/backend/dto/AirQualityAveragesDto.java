package com.milosz.podsiadly.backend.dto;

public record AirQualityAveragesDto(
        Double pm10, Double pm25,
        Double co,   Double co2,
        Double no2,  Double so2,
        Double o3,   Double ch4,
        Double uv
) {}
