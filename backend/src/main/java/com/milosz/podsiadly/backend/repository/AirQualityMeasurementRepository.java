package com.milosz.podsiadly.backend.repository;

import com.milosz.podsiadly.backend.entity.AirQualityMeasurement;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.time.Instant;
import java.util.List;
import java.util.Optional;

public interface AirQualityMeasurementRepository
        extends MongoRepository<AirQualityMeasurement, String> {

    List<AirQualityMeasurement> findByLocationIdAndRecordedAtBetweenOrderByRecordedAtAsc(
            String locationId, Instant from, Instant to
    );

    Optional<AirQualityMeasurement> findByLocationIdAndRecordedAt(
            String locationId, Instant recordedAt
    );
}
