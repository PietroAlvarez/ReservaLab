package dev.pietro.centroti.api;

public record TabletFleetSummaryResponse(
        int totalDevices,
        int compliantDevices,
        int attentionRequired,
        int installedApps,
        int unapprovedApps,
        int outdatedApps,
        String enforcementMode,
        String message) {
}
