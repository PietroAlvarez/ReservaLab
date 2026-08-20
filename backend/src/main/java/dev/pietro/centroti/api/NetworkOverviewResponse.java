package dev.pietro.centroti.api;

import java.time.Instant;
import java.util.List;

public record NetworkOverviewResponse(
        boolean configured,
        boolean connected,
        boolean readOnly,
        String source,
        String status,
        int sites,
        int totalDevices,
        int offlineDevices,
        int pendingUpdates,
        int wifiClients,
        int wiredClients,
        double wanUptime,
        List<String> siteNames,
        List<String> permissions,
        Instant lastSync,
        String message) {

    public static NetworkOverviewResponse notConfigured() {
        return new NetworkOverviewResponse(
                false, false, true, "UNIFI_SITE_MANAGER", "NO_CONFIGURADO",
                0, 0, 0, 0, 0, 0, 0,
                List.of(), List.of(), null,
                "Configura UNIFI_API_KEY en el backend. Ninguna credencial debe guardarse en Angular o GitHub.");
    }

    public static NetworkOverviewResponse unavailable(String message) {
        return new NetworkOverviewResponse(
                true, false, true, "UNIFI_SITE_MANAGER", "SIN_CONEXION",
                0, 0, 0, 0, 0, 0, 0,
                List.of(), List.of(), Instant.now(), message);
    }
}
