package com.milosz.podsiadly.backend.dto;

// src/main/java/.../dto/CitySnapshotDto.java
public record CitySnapshotDto(
        String id,
        String name,
        double lat,
        double lon,
        Double tMax,
        Integer pop
) {}

