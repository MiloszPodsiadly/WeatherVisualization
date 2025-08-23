package com.milosz.podsiadly.backend.controller;

import com.milosz.podsiadly.backend.dto.DailySeriesDto;
import com.milosz.podsiadly.backend.dto.PlSnapshotResponseDto;
import com.milosz.podsiadly.backend.service.ForecastService;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/forecast")
public class ForecastController {

    private final ForecastService service;

    public ForecastController(ForecastService service) {
        this.service = service;
    }

    @GetMapping("/pl-snapshot")
    public PlSnapshotResponseDto polandSnapshot(@RequestParam(defaultValue = "today") String range) {
        return service.polandSnapshot(range);
    }

    @GetMapping("/daily")
    public DailySeriesDto daily(
            @RequestParam double lat,
            @RequestParam double lon,
            @RequestParam(defaultValue = "7") int days
    ) {
        return service.daily(lat, lon, days);
    }
}
