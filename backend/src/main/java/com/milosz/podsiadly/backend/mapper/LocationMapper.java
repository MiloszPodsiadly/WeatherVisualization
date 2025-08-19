package com.milosz.podsiadly.backend.mapper;

import com.milosz.podsiadly.backend.dto.LocationDto;
import com.milosz.podsiadly.backend.entity.Location;
import org.springframework.stereotype.Component;

@Component
public class LocationMapper {

    public LocationDto toDto(Location l) {
        if (l == null) return null;
        return new LocationDto(
                l.getId(), l.getName(), l.getAdmin(), l.getCountry(),
                l.getLatitude(), l.getLongitude());
    }

    public Location fromDto(LocationDto dto) {
        if (dto == null) return null;
        return Location.builder()
                .id(dto.id())
                .name(dto.name())
                .admin(dto.admin())
                .country(dto.country())
                .latitude(dto.latitude())
                .longitude(dto.longitude())
                .build();
    }
}
