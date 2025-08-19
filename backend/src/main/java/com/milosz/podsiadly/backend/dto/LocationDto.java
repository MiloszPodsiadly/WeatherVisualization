package com.milosz.podsiadly.backend.dto;
public record LocationDto(
        String id, String name, String admin, String country, Double latitude, Double longitude
) {}
