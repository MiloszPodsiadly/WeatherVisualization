package com.milosz.podsiadly.backend.auth;

import lombok.*;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.Instant;
import java.util.*;

@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
@Document(collection = "users")
public class AppUser {
    @Id
    private UUID id;

    private String email;
    private String displayName;
    @Builder.Default
    private UserStatus status = UserStatus.ACTIVE;

    @Builder.Default
    private Set<String> roles = new HashSet<>();

    private Instant lastLoginAt;
}