package com.milosz.podsiadly.backend.controller;

import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.core.user.OAuth2User;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api")
public class MeController {
    @GetMapping("/me")
    public Map<String, Object> me(@AuthenticationPrincipal OAuth2User user) {
        if (user == null) {
            return Map.of("authenticated", false);
        }

        Map<String, Object> result = new java.util.HashMap<>();
        result.put("authenticated", true);
        result.put("id", user.getAttribute("id"));
        result.put("email", user.getAttribute("email"));
        result.put("name", user.getAttribute("name"));
        result.put("roles", user.getAuthorities());
        return result;
    }
}