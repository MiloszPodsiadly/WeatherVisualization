package com.milosz.podsiadly.backend.dto;

import java.util.List;
public record WeatherHistoryResponseDto(
        LocationDto location, String interval, List<WeatherPointDto> points, String source
) {}