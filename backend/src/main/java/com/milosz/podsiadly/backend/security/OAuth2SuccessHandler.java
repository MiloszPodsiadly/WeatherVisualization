package com.milosz.podsiadly.backend.security;

import jakarta.servlet.ServletException;
import jakarta.servlet.http.*;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.core.Authentication;
import org.springframework.security.web.DefaultRedirectStrategy;
import org.springframework.security.web.RedirectStrategy;
import org.springframework.security.web.authentication.AuthenticationSuccessHandler;
import org.springframework.stereotype.Component;

import java.io.IOException;

@Component
class OAuth2SuccessHandler implements AuthenticationSuccessHandler {

    @Value("${app.security.frontend-success-url:/}")
    private String configuredTarget;

    private final RedirectStrategy redirect = new DefaultRedirectStrategy();

    @Override
    public void onAuthenticationSuccess(HttpServletRequest request,
                                        HttpServletResponse response,
                                        Authentication authentication)
            throws IOException, ServletException {
        String target = resolveTargetUrl(request, configuredTarget);
        request.getSession(false);
        redirect.sendRedirect(request, response, target);
    }

    private static String resolveTargetUrl(HttpServletRequest req, String cfg) {
        if (cfg.startsWith("http://") || cfg.startsWith("https://")) return cfg;

        String scheme = headerOr(req, "X-Forwarded-Proto", req.getScheme());
        String host   = headerOr(req, "X-Forwarded-Host", req.getHeader("Host"));

        String context = req.getContextPath();
        if (context == null) context = "";

        String path = cfg.startsWith("/") ? cfg : "/" + cfg;
        return scheme + "://" + host + context + path;
    }

    private static String headerOr(HttpServletRequest req, String name, String fallback) {
        String v = req.getHeader(name);
        return (v != null && !v.isBlank()) ? v : fallback;
    }
}