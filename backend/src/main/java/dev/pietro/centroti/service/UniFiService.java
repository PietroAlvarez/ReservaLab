package dev.pietro.centroti.service;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.time.Instant;
import java.util.ArrayList;
import java.util.LinkedHashSet;

import org.springframework.stereotype.Service;
import org.springframework.beans.factory.annotation.Autowired;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;

import dev.pietro.centroti.api.NetworkOverviewResponse;
import dev.pietro.centroti.config.UniFiProperties;

@Service
public class UniFiService {

    private final UniFiProperties properties;
    private final ObjectMapper mapper;
    private final HttpClient client;

    @Autowired
    public UniFiService(UniFiProperties properties, ObjectMapper mapper) {
        this(properties, mapper, HttpClient.newBuilder()
                .connectTimeout(Duration.ofSeconds(properties.timeoutSeconds()))
                .build());
    }

    UniFiService(UniFiProperties properties, ObjectMapper mapper, HttpClient client) {
        this.properties = properties;
        this.mapper = mapper;
        this.client = client;
    }

    public NetworkOverviewResponse overview() {
        if (!properties.configured()) {
            return NetworkOverviewResponse.notConfigured();
        }

        try {
            var request = HttpRequest.newBuilder()
                    .uri(URI.create(properties.baseUrl() + "/v1/sites?pageSize=100"))
                    .timeout(Duration.ofSeconds(properties.timeoutSeconds()))
                    .header("Accept", "application/json")
                    .header("X-API-Key", properties.apiKey())
                    .GET()
                    .build();
            var response = client.send(request, HttpResponse.BodyHandlers.ofString());

            if (response.statusCode() != 200) {
                return NetworkOverviewResponse.unavailable(
                        response.statusCode() == 401
                                ? "UniFi rechazó la clave de lectura. Revisa UNIFI_API_KEY."
                                : "UniFi respondió con estado HTTP " + response.statusCode() + ".");
            }

            return parseOverview(mapper.readTree(response.body()));
        } catch (InterruptedException exception) {
            Thread.currentThread().interrupt();
            return NetworkOverviewResponse.unavailable("La consulta a UniFi fue interrumpida.");
        } catch (Exception exception) {
            return NetworkOverviewResponse.unavailable("No fue posible consultar UniFi: " + exception.getClass().getSimpleName());
        }
    }

    NetworkOverviewResponse parseOverview(JsonNode root) {
        JsonNode data = root.path("data");
        var names = new ArrayList<String>();
        var permissions = new LinkedHashSet<String>();
        int totalDevices = 0;
        int offlineDevices = 0;
        int pendingUpdates = 0;
        int wifiClients = 0;
        int wiredClients = 0;
        double uptimeSum = 0;
        int uptimeSamples = 0;

        if (data.isArray()) {
            for (JsonNode site : data) {
                JsonNode meta = site.path("meta");
                JsonNode counts = site.path("statistics").path("counts");
                JsonNode uptime = site.path("statistics").path("percentages").path("wanUptime");
                String siteName = meta.path("desc").asText(meta.path("name").asText("Sitio UniFi"));
                names.add(siteName);
                String permission = site.path("permission").asText("desconocido");
                permissions.add(permission);
                totalDevices += counts.path("totalDevice").asInt(0);
                offlineDevices += counts.path("offlineDevice").asInt(0);
                pendingUpdates += counts.path("pendingUpdateDevice").asInt(0);
                wifiClients += counts.path("wifiClient").asInt(0);
                wiredClients += counts.path("wiredClient").asInt(0);
                if (uptime.isNumber()) {
                    uptimeSum += uptime.asDouble();
                    uptimeSamples++;
                }
            }
        }

        String status = offlineDevices > 0 ? "ATENCION" : "OPERATIVA";
        double wanUptime = uptimeSamples == 0 ? 0 : Math.round((uptimeSum / uptimeSamples) * 10.0) / 10.0;
        return new NetworkOverviewResponse(
                true, true, true, "UNIFI_SITE_MANAGER", status,
                names.size(), totalDevices, offlineDevices, pendingUpdates,
                wifiClients, wiredClients, wanUptime,
                names, new ArrayList<>(permissions), Instant.now(),
                "Sincronización de lectura completada. Este conector no implementa operaciones de escritura.");
    }
}
