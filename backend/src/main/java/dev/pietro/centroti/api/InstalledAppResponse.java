package dev.pietro.centroti.api;

import java.time.Instant;

import dev.pietro.centroti.domain.InstalledApp;

public record InstalledAppResponse(
        String packageName,
        String name,
        String installedVersion,
        String approvedVersion,
        boolean approved,
        boolean outdated,
        boolean systemApp,
        Instant lastUpdated) {

    public static InstalledAppResponse from(InstalledApp app) {
        return new InstalledAppResponse(
                app.getPackageName(),
                app.getDisplayName(),
                app.getInstalledVersion(),
                app.getApprovedVersion(),
                app.isApproved(),
                app.isOutdated(),
                app.isSystemApp(),
                app.getLastUpdated());
    }
}
