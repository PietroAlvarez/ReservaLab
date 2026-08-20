package dev.pietro.centroti.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "app.unifi")
public record UniFiProperties(
        String baseUrl,
        String apiKey,
        int timeoutSeconds) {

    public UniFiProperties {
        baseUrl = baseUrl == null || baseUrl.isBlank() ? "https://api.ui.com" : baseUrl.replaceAll("/+$", "");
        apiKey = apiKey == null ? "" : apiKey.trim();
        timeoutSeconds = timeoutSeconds <= 0 ? 12 : timeoutSeconds;
    }

    public boolean configured() {
        return !apiKey.isBlank();
    }
}
