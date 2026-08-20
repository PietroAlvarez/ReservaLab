package dev.pietro.centroti.domain;

import java.time.Instant;

import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;

@Entity
@Table(name = "installed_apps", uniqueConstraints = @UniqueConstraint(
        name = "uk_tablet_package", columnNames = { "tablet_id", "package_name" }))
public class InstalledApp {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "tablet_id", nullable = false)
    private TabletDevice tablet;

    private String packageName;
    private String displayName;
    private String installedVersion;
    private String approvedVersion;
    private boolean approved;
    private boolean systemApp;
    private Instant lastUpdated;

    protected InstalledApp() {
    }

    public InstalledApp(String packageName, String displayName, String installedVersion,
            String approvedVersion, boolean approved, boolean systemApp, Instant lastUpdated) {
        this.packageName = packageName;
        this.displayName = displayName;
        this.installedVersion = installedVersion;
        this.approvedVersion = approvedVersion;
        this.approved = approved;
        this.systemApp = systemApp;
        this.lastUpdated = lastUpdated;
    }

    void assignTo(TabletDevice tablet) {
        this.tablet = tablet;
    }

    public Long getId() { return id; }
    public String getPackageName() { return packageName; }
    public String getDisplayName() { return displayName; }
    public String getInstalledVersion() { return installedVersion; }
    public String getApprovedVersion() { return approvedVersion; }
    public boolean isApproved() { return approved; }
    public boolean isSystemApp() { return systemApp; }
    public Instant getLastUpdated() { return lastUpdated; }

    public boolean isOutdated() {
        return approvedVersion != null && !approvedVersion.isBlank() && !approvedVersion.equals(installedVersion);
    }
}
