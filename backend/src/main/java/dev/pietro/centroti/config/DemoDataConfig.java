package dev.pietro.centroti.config;

import java.time.Instant;

import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.context.annotation.Configuration;
import org.springframework.transaction.annotation.Transactional;

import dev.pietro.centroti.domain.InstalledApp;
import dev.pietro.centroti.domain.TabletDevice;
import dev.pietro.centroti.repository.TabletDeviceRepository;

@Configuration
public class DemoDataConfig implements ApplicationRunner {

    private final TabletDeviceRepository tablets;

    public DemoDataConfig(TabletDeviceRepository tablets) {
        this.tablets = tablets;
    }

    @Override
    @Transactional
    public void run(ApplicationArguments args) {
        if (tablets.count() > 0) {
            return;
        }

        var tablet1 = tablet("TAB-001", "R9WN10001", "84:25:19:10:00:01", Instant.now().minusSeconds(900));
        tablet1.addApp(app("com.google.android.apps.docs", "Google Drive", "2.26.310", "2.26.310", true));
        tablet1.addApp(app("com.google.android.calendar", "Google Calendar", "2026.30", "2026.30", true));
        tablet1.addApp(app("com.android.chrome", "Google Chrome", "138.0", "138.0", true));

        var tablet2 = tablet("TAB-002", "R9WN10002", "84:25:19:10:00:02", Instant.now().minusSeconds(1800));
        tablet2.addApp(app("com.google.android.apps.docs", "Google Drive", "2.26.290", "2.26.310", true));
        tablet2.addApp(app("com.android.chrome", "Google Chrome", "137.0", "138.0", true));
        tablet2.addApp(app("com.example.game", "Juego no autorizado", "1.4", "", false));

        var tablet3 = tablet("TAB-003", "R9WN10003", "84:25:19:10:00:03", Instant.now().minusSeconds(10 * 24 * 3600));
        tablet3.addApp(app("com.android.chrome", "Google Chrome", "138.0", "138.0", true));

        var tablet4 = tablet("TAB-004", "R9WN10004", "84:25:19:10:00:04", Instant.now().minusSeconds(600));
        tablet4.addApp(app("com.google.android.apps.docs", "Google Drive", "2.26.310", "2.26.310", true));
        tablet4.addApp(app("com.android.chrome", "Google Chrome", "138.0", "138.0", true));

        tablets.save(tablet1);
        tablets.save(tablet2);
        tablets.save(tablet3);
        tablets.save(tablet4);
    }

    private TabletDevice tablet(String id, String serial, String mac, Instant lastSeen) {
        return new TabletDevice(
                id, "Samsung Galaxy Tab A 8.0 (SM-T295)", serial, mac,
                "11", "2021-09-01", "OPERATIVA", "Carro de tablets", "",
                "HEADWIND_MDM", "AULA_RESTRINGIDA", lastSeen);
    }

    private InstalledApp app(String packageName, String name, String installed, String approved, boolean allowed) {
        return new InstalledApp(packageName, name, installed, approved, allowed, false, Instant.now().minusSeconds(3600));
    }
}
