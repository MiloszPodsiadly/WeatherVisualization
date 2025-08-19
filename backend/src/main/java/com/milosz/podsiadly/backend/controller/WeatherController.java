package com.milosz.podsiadly.backend.controller;

import com.milosz.podsiadly.backend.dto.WeatherCurrentDto;
import com.milosz.podsiadly.backend.dto.WeatherHistoryResponseDto;
import com.milosz.podsiadly.backend.service.LocationService;
import com.milosz.podsiadly.backend.service.WeatherService;
import org.springframework.web.bind.annotation.*;

import java.time.Instant;

@RestController
@RequestMapping("/api/weather")
public class    WeatherController {

    private final WeatherService weatherService;
    private final LocationService locationService;

    public WeatherController(WeatherService weatherService, LocationService locationService) {
        this.weatherService = weatherService;
        this.locationService = locationService;
    }

    @GetMapping("/current")
    public WeatherCurrentDto current(@RequestParam String locationId) {
        var loc = locationService.require(locationId);
        return weatherService.current(loc);
    }

    @GetMapping("/history")
    public WeatherHistoryResponseDto history(
            @RequestParam String locationId,
            @RequestParam Instant from,
            @RequestParam Instant to,
            @RequestParam(defaultValue = "1h") String interval) {
        var loc = locationService.require(locationId);
        return weatherService.history(loc, from, to, interval);
    }
}
