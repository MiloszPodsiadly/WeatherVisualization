package com.milosz.podsiadly.backend.controller;

import com.milosz.podsiadly.backend.dto.AirQualitySeriesDto;
import com.milosz.podsiadly.backend.service.AirQualityService;
import org.springframework.web.bind.annotation.*;

import java.time.Instant;

@RestController
@RequestMapping("/api/air-quality")
public class AirQualityController {

    private final AirQualityService service;

    public AirQualityController(AirQualityService service) {
        this.service = service;
    }

    /** ALWAYS: fetch from Open-Meteo -> upsert Mongo -> return fetched points + averages. */
    @PostMapping("/live/{locationId}")
    public AirQualitySeriesDto live(
            @PathVariable String locationId,
            @RequestParam String from,
            @RequestParam String to
    ) {
        return service.live(locationId, Instant.parse(from), Instant.parse(to));
    }

    /** Optional: pure DB history (no external fetch). */
    @GetMapping("/history/{locationId}")
    public AirQualitySeriesDto historyOnly(
            @PathVariable String locationId,
            @RequestParam String from,
            @RequestParam String to
    ) {
        var points = service.history(locationId, Instant.parse(from), Instant.parse(to));
        var averages = service.computeAverages(points);
        return new AirQualitySeriesDto(averages, points);
    }
}
