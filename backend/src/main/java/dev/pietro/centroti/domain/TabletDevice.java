package dev.pietro.centroti.domain;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;

import jakarta.persistence.CascadeType;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.Id;
import jakarta.persistence.OneToMany;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;

@Entity
@Table(name = "tablet_devices", uniqueConstraints = {
        @UniqueConstraint(name = "uk_tablet_serial", columnNames = "serial"),
        @UniqueConstraint(name = "uk_tablet_mac", columnNames = "mac")
})
public class TabletDevice {

    @Id
    private String id;
    private String model;
    private String serial;
    private String mac;
    private String androidVersion;
    private String securityPatch;
    private String status;
    private String location;
    private String assignedTo;
    private String managementProvider;
    private String restrictionProfile;
    private Instant lastSeen;

    @OneToMany(mappedBy = "tablet", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.LAZY)
    private List<InstalledApp> installedApps = new ArrayList<>();

    protected TabletDevice() {
    }

    public TabletDevice(String id, String model, String serial, String mac, String androidVersion,
            String securityPatch, String status, String location, String assignedTo,
            String managementProvider, String restrictionProfile, Instant lastSeen) {
        this.id = id;
        this.model = model;
        this.serial = serial;
        this.mac = mac;
        this.androidVersion = androidVersion;
        this.securityPatch = securityPatch;
        this.status = status;
        this.location = location;
        this.assignedTo = assignedTo;
        this.managementProvider = managementProvider;
        this.restrictionProfile = restrictionProfile;
        this.lastSeen = lastSeen;
    }

    public void addApp(InstalledApp app) {
        installedApps.add(app);
        app.assignTo(this);
    }

    public String getId() { return id; }
    public String getModel() { return model; }
    public String getSerial() { return serial; }
    public String getMac() { return mac; }
    public String getAndroidVersion() { return androidVersion; }
    public String getSecurityPatch() { return securityPatch; }
    public String getStatus() { return status; }
    public String getLocation() { return location; }
    public String getAssignedTo() { return assignedTo; }
    public String getManagementProvider() { return managementProvider; }
    public String getRestrictionProfile() { return restrictionProfile; }
    public Instant getLastSeen() { return lastSeen; }
    public List<InstalledApp> getInstalledApps() { return installedApps; }
}
