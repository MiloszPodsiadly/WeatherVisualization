package com.milosz.podsiadly.backend.dto;

import java.util.List;

public record DailySeriesDto(
        List<String> dates,
        List<Double> tmax,
        List<Integer> pop
) {}
