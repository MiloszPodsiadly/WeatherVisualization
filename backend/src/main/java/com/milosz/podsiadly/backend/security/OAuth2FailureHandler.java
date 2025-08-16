package com.milosz.podsiadly.backend.security;

import jakarta.servlet.ServletException;
import jakarta.servlet.http.*;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.core.AuthenticationException;
import org.springframework.security.web.DefaultRedirectStrategy;
import org.springframework.security.web.RedirectStrategy;
import org.springframework.security.web.authentication.AuthenticationFailureHandler;
import org.springframework.stereotype.Component;

import java.io.IOException;

@Component
public class OAuth2FailureHandler implements AuthenticationFailureHandler {

    @Value("${app.security.frontend-failure-url:/login?error}")
    private String configuredTarget;

    private final RedirectStrategy redirect = new DefaultRedirectStrategy();

    @Override
    public void onAuthenticationFailure(HttpServletRequest request,
                                        HttpServletResponse response,
                                        AuthenticationException exception)
            throws IOException, ServletException {
        String target = resolveTargetUrl(request, configuredTarget);
        redirect.sendRedirect(request, response, target);
    }

    private static String resolveTargetUrl(HttpServletRequest req, String cfg) {
        if (cfg.startsWith("http://") || cfg.startsWith("https://")) return cfg;
        String scheme = headerOr(req, "X-Forwarded-Proto", req.getScheme());
        String host   = headerOr(req, "X-Forwarded-Host", req.getHeader("Host"));
        String ctx    = req.getContextPath() == null ? "" : req.getContextPath();
        String path   = cfg.startsWith("/") ? cfg : "/" + cfg;
        return scheme + "://" + host + ctx + path;
    }

    private static String headerOr(HttpServletRequest req, String name, String fallback) {
        String v = req.getHeader(name);
        return (v != null && !v.isBlank()) ? v : fallback;
    }
}