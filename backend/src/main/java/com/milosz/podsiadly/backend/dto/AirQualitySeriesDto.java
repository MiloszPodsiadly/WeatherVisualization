package com.milosz.podsiadly.backend.dto;

import java.util.List;

public record AirQualitySeriesDto(
        AirQualityAveragesDto averages,
        List<AirQualityPointDto> points
) {}
