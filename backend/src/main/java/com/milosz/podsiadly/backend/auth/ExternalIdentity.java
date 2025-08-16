package com.milosz.podsiadly.backend.auth;

import lombok.*;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.Instant;
import java.util.UUID;

@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
@Document(collection = "external_identities")
public class ExternalIdentity {
    @Id
    private UUID id;

    private UUID userId;
    private AuthProvider provider;
    private String providerUserId;

    private Instant accessTokenExpiresAt;
}
