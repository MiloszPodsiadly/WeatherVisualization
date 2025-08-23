package com.milosz.podsiadly.backend.dto;

public record CitySnapshotDto(
        String id,
        String name,
        double lat,
        double lon,
        Double tMax,
        Integer pop
) {}

