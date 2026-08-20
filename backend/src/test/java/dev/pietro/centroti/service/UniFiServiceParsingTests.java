package dev.pietro.centroti.service;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.Test;

import com.fasterxml.jackson.databind.ObjectMapper;

import dev.pietro.centroti.config.UniFiProperties;

class UniFiServiceParsingTests {

    private final ObjectMapper mapper = new ObjectMapper();
    private final UniFiService service = new UniFiService(
            new UniFiProperties("https://api.ui.com", "test-key", 2), mapper);

    @Test
    void aggregatesReadOnlySiteManagerOverview() throws Exception {
        var payload = mapper.readTree("""
                {
                  "data": [
                    {
                      "meta": {"desc": "Colegio"},
                      "permission": "readonly",
                      "statistics": {
                        "counts": {
                          "totalDevice": 8,
                          "offlineDevice": 1,
                          "offlineWifiDevice": 1,
                          "pendingUpdateDevice": 2,
                          "wifiClient": 42,
                          "wiredClient": 18
                        },
                        "percentages": {"wanUptime": 99.8}
                      }
                    }
                  ]
                }
                """);

        var overview = service.parseOverview(payload);

        assertThat(overview.connected()).isTrue();
        assertThat(overview.readOnly()).isTrue();
        assertThat(overview.permissions()).containsExactly("readonly");
        assertThat(overview.totalDevices()).isEqualTo(8);
        assertThat(overview.offlineDevices()).isEqualTo(1);
        assertThat(overview.offlineAccessPoints()).isEqualTo(1);
        assertThat(overview.wanUptime()).isEqualTo(99.8);
        assertThat(overview.status()).isEqualTo("ATENCION");
    }

    @Test
    void extractsOnlyAccessPointsThatRequireAttention() throws Exception {
        var payload = mapper.readTree("""
                {
                  "data": [
                    {
                      "id": "ap-1",
                      "name": "AP Biblioteca",
                      "model": "U6-LR",
                      "macAddress": "00:11:22:33:44:55",
                      "ipAddress": "10.0.0.21",
                      "state": "OFFLINE",
                      "features": ["accessPoint"]
                    },
                    {
                      "id": "ap-2",
                      "name": "AP Laboratorio",
                      "model": "U7-Pro",
                      "state": "ONLINE",
                      "features": ["accessPoint"]
                    },
                    {
                      "id": "switch-1",
                      "name": "Switch principal",
                      "model": "USW-24",
                      "state": "OFFLINE",
                      "features": ["switching"]
                    }
                  ]
                }
                """);

        var alerts = service.parseAccessPointAlerts(payload, "Colegio");

        assertThat(alerts).hasSize(1);
        assertThat(alerts.getFirst().name()).isEqualTo("AP Biblioteca");
        assertThat(alerts.getFirst().state()).isEqualTo("OFFLINE");
        assertThat(alerts.getFirst().siteName()).isEqualTo("Colegio");
        assertThat(alerts.getFirst().alert()).isEqualTo("Apagada o sin conexión");
    }
}
