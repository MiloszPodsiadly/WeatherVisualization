package com.milosz.podsiadly.backend.entity;

import lombok.Builder;
import lombok.Getter;
import lombok.Setter;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.CompoundIndex;
import org.springframework.data.mongodb.core.index.CompoundIndexes;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.Instant;
@Setter
@Getter
@Builder(toBuilder = true)
@Document(collection = "air_quality_measurement")
@CompoundIndexes({
        @CompoundIndex(name = "uk_aq_loc_time", def = "{'locationId': 1, 'recordedAt': 1}", unique = true)
})
public class AirQualityMeasurement {

    @Id
    private String id;

    private String locationId;

    private Instant recordedAt;

    private Double pm10;
    private Double pm25;
    private Double co;
    private Double co2;
    private Double no2;
    private Double so2;
    private Double o3;
    private Double ch4;
    private Double uv;

}
