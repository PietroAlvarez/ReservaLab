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
        int offlineAccessPoints,
        int pendingUpdates,
        int wifiClients,
        int wiredClients,
        double wanUptime,
        List<String> siteNames,
        List<String> permissions,
        boolean deviceDetailsAvailable,
        List<AccessPointAlertResponse> accessPointAlerts,
        String deviceDetailsMessage,
        Instant lastSync,
        String message) {

    public static NetworkOverviewResponse notConfigured() {
        return new NetworkOverviewResponse(
                false, false, true, "UNIFI_SITE_MANAGER", "NO_CONFIGURADO",
                0, 0, 0, 0, 0, 0, 0, 0,
                List.of(), List.of(), false, List.of(),
                "Configura el conector para consultar el estado individual de las antenas.", null,
                "Configura UNIFI_API_KEY en el backend. Ninguna credencial debe guardarse en Angular o GitHub.");
    }

    public static NetworkOverviewResponse unavailable(String message) {
        return new NetworkOverviewResponse(
                true, false, true, "UNIFI_SITE_MANAGER", "SIN_CONEXION",
                0, 0, 0, 0, 0, 0, 0, 0,
                List.of(), List.of(), false, List.of(),
                "No fue posible consultar el detalle de las antenas.", Instant.now(), message);
    }
}
