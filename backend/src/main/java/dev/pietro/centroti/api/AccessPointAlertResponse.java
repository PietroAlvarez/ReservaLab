package dev.pietro.centroti.api;

public record AccessPointAlertResponse(
        String id,
        String name,
        String model,
        String macAddress,
        String ipAddress,
        String state,
        String siteName,
        String alert) {
}
