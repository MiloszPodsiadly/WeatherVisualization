package com.milosz.podsiadly.backend.controller;

import com.milosz.podsiadly.backend.dto.AirQualitySeriesDto;
import com.milosz.podsiadly.backend.service.AirQualityService;
import org.springframework.web.bind.annotation.*;

import java.time.Duration;
import java.time.Instant;

@RestController
@RequestMapping("/api/air-quality")
public class AirQualityController {

    private final AirQualityService service;

    public AirQualityController(AirQualityService service) {
        this.service = service;
    }

    @PostMapping("/live/{locationId}/last24h")
    public AirQualitySeriesDto liveLast24h(@PathVariable String locationId) {
        Instant to   = Instant.now();
        Instant from = to.minus(Duration.ofHours(24));
        return service.live(locationId, from, to);
    }

    @GetMapping("/history/{locationId}/last24h")
    public AirQualitySeriesDto historyLast24h(@PathVariable String locationId) {
        Instant to   = Instant.now();
        Instant from = to.minus(Duration.ofHours(24));
        var points   = service.history(locationId, from, to);
        var averages = service.computeAverages(points);
        return new AirQualitySeriesDto(averages, points);
    }
}
