package com.milosz.podsiadly.backend.dto;
public record WeatherCurrentDto(LocationDto location, WeatherPointDto data, String source) {}