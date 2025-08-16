package com.milosz.podsiadly.backend.security;


import com.milosz.podsiadly.backend.auth.*;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.oauth2.client.userinfo.*;
import org.springframework.security.oauth2.core.*;
import org.springframework.security.oauth2.core.user.*;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.*;

@Service
@RequiredArgsConstructor
public class CustomOAuth2UserService implements OAuth2UserService<OAuth2UserRequest, OAuth2User> {

    private final AppUserRepository userRepo;
    private final ExternalIdentityRepository identityRepo;

    @Override
    public OAuth2User loadUser(OAuth2UserRequest req) throws OAuth2AuthenticationException {
        var delegate = new DefaultOAuth2UserService();
        var oauthUser = delegate.loadUser(req);

        var regId = req.getClientRegistration().getRegistrationId();
        var provider = switch (regId.toLowerCase()) {
            case "google" -> AuthProvider.GOOGLE;
            case "github" -> AuthProvider.GITHUB;
            default -> throw new OAuth2AuthenticationException(
                    new OAuth2Error("provider_unsupported"), "Unsupported provider: " + regId);
        };

        var a = oauthUser.getAttributes();

        var providerUserId = switch (provider) {
            case GOOGLE -> Objects.toString(a.get("sub"), null);
            case GITHUB -> Objects.toString(a.get("id"), null);
        };
        if (providerUserId == null) {
            throw new OAuth2AuthenticationException(new OAuth2Error("missing_id"), "Provider user id missing");
        }

        var email = switch (provider) {
            case GOOGLE -> {
                var e = Objects.toString(a.get("email"), null);
                yield e != null ? e : (providerUserId + "@users.noreply.google.com");
            }
            case GITHUB -> {
                var e = Objects.toString(a.get("email"), null);
                yield e != null ? e : (Objects.toString(a.get("login"), "user") + "@users.noreply.github.com");
            }
        };

        var name = switch (provider) {
            case GOOGLE -> {
                var n = Objects.toString(a.get("name"), null);
                yield n != null ? n : email;
            }
            case GITHUB -> {
                var n = Objects.toString(a.get("name"), null);
                yield n != null ? n : Objects.toString(a.get("login"), email);
            }
        };

        var user = userRepo.findByEmail(email).orElseGet(() -> {
            var u = AppUser.builder()
                    .id(UUID.randomUUID())
                    .email(email)
                    .displayName(name)
                    .build();
            u.getRoles().add("ROLE_USER");
            return userRepo.save(u);
        });

        if (!Objects.equals(user.getDisplayName(), name)) {
            user.setDisplayName(name);
        }
        user.setLastLoginAt(Instant.now());
        userRepo.save(user);

        identityRepo.findByProviderAndProviderUserId(provider, providerUserId)
                .orElseGet(() -> identityRepo.save(ExternalIdentity.builder()
                        .id(UUID.randomUUID())
                        .userId(user.getId())
                        .provider(provider)
                        .providerUserId(providerUserId)
                        .build()));

        var authorities = user.getRoles().stream()
                .map(SimpleGrantedAuthority::new)
                .toList();

        Map<String, Object> principal = new HashMap<>();
        principal.put("id", user.getId().toString());
        principal.put("email", user.getEmail());
        principal.put("name", user.getDisplayName());

        return new DefaultOAuth2User(authorities, principal, "email");
    }
}

