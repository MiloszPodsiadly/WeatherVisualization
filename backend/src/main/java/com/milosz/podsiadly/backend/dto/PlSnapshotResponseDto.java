package com.milosz.podsiadly.backend.dto;

import java.time.Instant;
import java.util.List;

public record PlSnapshotResponseDto(
        String range,
        Instant generatedAt,
        List<CitySnapshotDto> cities
) {}
