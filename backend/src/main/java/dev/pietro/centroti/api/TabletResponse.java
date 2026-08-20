package dev.pietro.centroti.api;

import java.time.Instant;
import java.util.List;

import dev.pietro.centroti.domain.TabletDevice;

public record TabletResponse(
        String id,
        String model,
        String serial,
        String mac,
        String androidVersion,
        String securityPatch,
        String status,
        String location,
        String assignedTo,
        String managementProvider,
        String restrictionProfile,
        Instant lastSeen,
        boolean compliant,
        int installedAppCount,
        int unapprovedAppCount,
        int outdatedAppCount,
        List<InstalledAppResponse> apps) {

    public static TabletResponse from(TabletDevice tablet, boolean includeApps) {
        var apps = tablet.getInstalledApps().stream().map(InstalledAppResponse::from).toList();
        int unapproved = (int) apps.stream().filter(app -> !app.approved()).count();
        int outdated = (int) apps.stream().filter(InstalledAppResponse::outdated).count();
        boolean recent = tablet.getLastSeen() != null && tablet.getLastSeen().isAfter(Instant.now().minusSeconds(7 * 24 * 3600));
        return new TabletResponse(
                tablet.getId(), tablet.getModel(), tablet.getSerial(), tablet.getMac(),
                tablet.getAndroidVersion(), tablet.getSecurityPatch(), tablet.getStatus(),
                tablet.getLocation(), tablet.getAssignedTo(), tablet.getManagementProvider(),
                tablet.getRestrictionProfile(), tablet.getLastSeen(),
                unapproved == 0 && outdated == 0 && recent,
                apps.size(), unapproved, outdated,
                includeApps ? apps : List.of());
    }
}
