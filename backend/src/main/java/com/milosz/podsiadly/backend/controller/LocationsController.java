package com.milosz.podsiadly.backend.controller;

import com.milosz.podsiadly.backend.dto.LocationDto;
import com.milosz.podsiadly.backend.service.LocationService;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/locations")
public class LocationsController {

    private final LocationService service;

    public LocationsController(LocationService service) {
        this.service = service;
    }

    /**
     * Szukanie miasta po nazwie w cache/Mongo lub w Open-Meteo.
     * Przykład: GET /api/locations/search?query=Warszawa
     */
    @GetMapping("/search")
    public List<LocationDto> search(
            @RequestParam String query,
            @RequestParam(defaultValue = "5") int count) {
        return service.search(query, count);
    }
}
