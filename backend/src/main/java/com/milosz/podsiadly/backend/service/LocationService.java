package com.milosz.podsiadly.backend.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.milosz.podsiadly.backend.dto.LocationDto;
import com.milosz.podsiadly.backend.entity.Location;
import com.milosz.podsiadly.backend.mapper.LocationMapper;
import com.milosz.podsiadly.backend.repository.LocationRepository;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;

import java.util.ArrayList;
import java.util.List;

@Service
public class LocationService {
    private final RestClient http;
    private final ObjectMapper om = new ObjectMapper();
    private final LocationRepository repo;
    private final LocationMapper mapper;

    public LocationService(RestClient http, LocationRepository repo, LocationMapper mapper) {
        this.http = http; this.repo = repo; this.mapper = mapper;
    }

    public List<LocationDto> search(String query, int count) {
        var cached = repo.findByNameIgnoreCase(query);
        var out = new ArrayList<LocationDto>();
        cached.forEach(l -> out.add(mapper.toDto(l)));
        if (!out.isEmpty()) return out;

        String url = "https://geocoding-api.open-meteo.com/v1/search?name=" + query +
                "&count=" + count + "&language=pl&format=json";
        String body = http.get().uri(url).retrieve().body(String.class);
        try {
            JsonNode root = om.readTree(body).path("results");
            if (root.isMissingNode()) return List.of();
            for (JsonNode n : root) {
                Location l = Location.builder()
                        .name(n.path("name").asText())
                        .admin(n.path("admin1").asText(null))
                        .country(n.path("country_code").asText())
                        .latitude(n.path("latitude").asDouble())
                        .longitude(n.path("longitude").asDouble())
                        .build();
                repo.save(l);
                out.add(mapper.toDto(l));
            }
            return out;
        } catch (Exception e) {
            return out;
        }
    }

    public Location require(String locationId) {
        return repo.findById(locationId)
                .orElseThrow(() -> new IllegalArgumentException("Location not found: " + locationId));
    }
}