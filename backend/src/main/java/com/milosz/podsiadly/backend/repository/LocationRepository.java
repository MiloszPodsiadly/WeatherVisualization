package com.milosz.podsiadly.backend.repository;

import com.milosz.podsiadly.backend.entity.Location;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.List;

public interface LocationRepository extends MongoRepository<Location, String> {
    List<Location> findByNameIgnoreCase(String name);
}
