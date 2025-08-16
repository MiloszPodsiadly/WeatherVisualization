package com.milosz.podsiadly.backend.auth;

import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.Optional;
import java.util.UUID;

public interface AppUserRepository extends MongoRepository<AppUser, UUID> {
    Optional<AppUser> findByEmail(String email);
}
