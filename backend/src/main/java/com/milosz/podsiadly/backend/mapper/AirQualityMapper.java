package com.milosz.podsiadly.backend.mapper;

import com.milosz.podsiadly.backend.dto.AirQualityPointDto;
import com.milosz.podsiadly.backend.entity.AirQualityMeasurement;
import org.springframework.stereotype.Component;

@Component
public class AirQualityMapper {

    public AirQualityPointDto toDto(AirQualityMeasurement e) {
        if (e == null) return null;
        return new AirQualityPointDto(
                e.getRecordedAt(),
                e.getPm10(),
                e.getPm25(),
                e.getCo(),
                e.getCo2(),
                e.getNo2(),
                e.getSo2(),
                e.getO3(),
                e.getCh4(),
                e.getUv()
        );
    }

    public AirQualityMeasurement fromDto(String locationId, AirQualityPointDto dto) {
        if (dto == null) return null;
        return AirQualityMeasurement.builder()
                .locationId(locationId)
                .recordedAt(dto.time())
                .pm10(dto.pm10())
                .pm25(dto.pm25())
                .co(dto.co())
                .co2(dto.co2())
                .no2(dto.no2())
                .so2(dto.so2())
                .o3(dto.o3())
                .ch4(dto.ch4())
                .uv(dto.uv())
                .build();
    }
}
