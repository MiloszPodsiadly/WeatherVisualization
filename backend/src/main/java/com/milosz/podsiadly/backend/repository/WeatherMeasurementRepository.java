package com.milosz.podsiadly.backend.repository;

import com.milosz.podsiadly.backend.entity.WeatherMeasurement;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.time.Instant;
import java.util.List;

public interface WeatherMeasurementRepository extends MongoRepository<WeatherMeasurement, String> {
    List<WeatherMeasurement> findByLocationIdAndRecordedAtBetweenOrderByRecordedAt(
            String locationId, Instant from, Instant to);
}
