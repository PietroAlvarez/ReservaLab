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
        assertThat(overview.wanUptime()).isEqualTo(99.8);
        assertThat(overview.status()).isEqualTo("ATENCION");
    }
}
