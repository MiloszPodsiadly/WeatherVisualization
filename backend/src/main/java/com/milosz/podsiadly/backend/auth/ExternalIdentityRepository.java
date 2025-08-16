package com.milosz.podsiadly.backend.auth;

import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.Optional;
import java.util.UUID;

public interface ExternalIdentityRepository extends MongoRepository<ExternalIdentity, UUID> {
    Optional<ExternalIdentity> findByProviderAndProviderUserId(AuthProvider provider, String providerUserId);
    Optional<ExternalIdentity> findByUserIdAndProvider(UUID userId, AuthProvider provider);
}