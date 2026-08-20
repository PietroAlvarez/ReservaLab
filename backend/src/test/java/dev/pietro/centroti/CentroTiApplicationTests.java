package dev.pietro.centroti;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;

import dev.pietro.centroti.service.TabletService;

@SpringBootTest
class CentroTiApplicationTests {

    @Autowired
    TabletService tablets;

    @Test
    void loadsTabletFleetAndCalculatesCompliance() {
        var summary = tablets.summary();
        assertThat(summary.totalDevices()).isEqualTo(4);
        assertThat(summary.installedApps()).isEqualTo(9);
        assertThat(summary.unapprovedApps()).isEqualTo(1);
        assertThat(summary.outdatedApps()).isEqualTo(2);
        assertThat(summary.enforcementMode()).isEqualTo("REPORT_ONLY");
    }
}
