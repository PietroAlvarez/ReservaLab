package dev.pietro.centroti.service;

import java.net.URI;
import java.net.URLEncoder;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.time.Instant;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;

import org.springframework.stereotype.Service;
import org.springframework.beans.factory.annotation.Autowired;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;

import dev.pietro.centroti.api.AccessPointAlertResponse;
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

            JsonNode sitesPayload = mapper.readTree(response.body());
            NetworkOverviewResponse overview = parseOverview(sitesPayload);
            return attachAccessPointAlerts(overview, sitesPayload);
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
        int offlineAccessPoints = 0;
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
                offlineAccessPoints += counts.path("offlineWifiDevice").asInt(0);
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
                names.size(), totalDevices, offlineDevices, offlineAccessPoints, pendingUpdates,
                wifiClients, wiredClients, wanUptime,
                names, new ArrayList<>(permissions), offlineAccessPoints == 0, List.of(),
                offlineAccessPoints == 0
                        ? "No hay antenas fuera de línea reportadas."
                        : "Consultando el detalle individual de las antenas con alertas.",
                Instant.now(),
                "Sincronización de lectura completada. Este conector no implementa operaciones de escritura.");
    }

    private NetworkOverviewResponse attachAccessPointAlerts(NetworkOverviewResponse overview, JsonNode sitesPayload)
            throws InterruptedException {
        if (overview.offlineAccessPoints() == 0) {
            return overview;
        }

        var alerts = new ArrayList<AccessPointAlertResponse>();
        boolean detailsAvailable = true;
        JsonNode sites = sitesPayload.path("data");

        if (!sites.isArray()) {
            detailsAvailable = false;
        } else {
            for (JsonNode site : sites) {
                if (site.path("statistics").path("counts").path("offlineWifiDevice").asInt(0) == 0) {
                    continue;
                }

                String hostId = site.path("hostId").asText("");
                String siteId = site.path("siteId").asText("");
                String siteName = site.path("meta").path("desc")
                        .asText(site.path("meta").path("name").asText("Sitio UniFi"));
                if (hostId.isBlank() || siteId.isBlank()) {
                    detailsAvailable = false;
                    continue;
                }

                try {
                    HttpResponse<String> response = client.send(deviceRequest(hostId, siteId), HttpResponse.BodyHandlers.ofString());
                    if (response.statusCode() != 200) {
                        detailsAvailable = false;
                        continue;
                    }
                    alerts.addAll(parseAccessPointAlerts(mapper.readTree(response.body()), siteName));
                } catch (InterruptedException exception) {
                    throw exception;
                } catch (Exception exception) {
                    detailsAvailable = false;
                }
            }
        }

        String detailMessage;
        if (!detailsAvailable) {
            detailMessage = "UniFi reporta antenas fuera de línea, pero el permiso actual no entregó todo el detalle individual.";
        } else if (alerts.isEmpty()) {
            detailMessage = "UniFi reporta antenas fuera de línea, pero no fue posible identificarlas dentro del listado de dispositivos.";
        } else {
            detailMessage = alerts.size() == 1
                    ? "Se identificó 1 antena que requiere atención."
                    : "Se identificaron " + alerts.size() + " antenas que requieren atención.";
        }

        return new NetworkOverviewResponse(
                overview.configured(), overview.connected(), overview.readOnly(), overview.source(), overview.status(),
                overview.sites(), overview.totalDevices(), overview.offlineDevices(), overview.offlineAccessPoints(),
                overview.pendingUpdates(), overview.wifiClients(), overview.wiredClients(), overview.wanUptime(),
                overview.siteNames(), overview.permissions(), detailsAvailable, alerts, detailMessage,
                overview.lastSync(), overview.message());
    }

    private HttpRequest deviceRequest(String hostId, String siteId) {
        String endpoint = properties.baseUrl()
                + "/v1/connector/consoles/" + encodePathSegment(hostId)
                + "/proxy/network/integration/v1/sites/" + encodePathSegment(siteId)
                + "/devices?offset=0&limit=200";
        return HttpRequest.newBuilder()
                .uri(URI.create(endpoint))
                .timeout(Duration.ofSeconds(properties.timeoutSeconds()))
                .header("Accept", "application/json")
                .header("X-API-Key", properties.apiKey())
                .GET()
                .build();
    }

    List<AccessPointAlertResponse> parseAccessPointAlerts(JsonNode root, String siteName) {
        var alerts = new ArrayList<AccessPointAlertResponse>();
        JsonNode devices = root.path("data");
        if (!devices.isArray()) {
            return alerts;
        }

        for (JsonNode device : devices) {
            String state = device.path("state").asText("DESCONOCIDO").toUpperCase(Locale.ROOT);
            if (!isHealthyState(state) && isAccessPoint(device)) {
                alerts.add(new AccessPointAlertResponse(
                        device.path("id").asText(""),
                        device.path("name").asText("Antena sin nombre"),
                        device.path("model").asText("Modelo no informado"),
                        device.path("macAddress").asText(""),
                        device.path("ipAddress").asText(""),
                        state,
                        siteName,
                        alertLabel(state)));
            }
        }
        return alerts;
    }

    private boolean isAccessPoint(JsonNode device) {
        JsonNode features = device.path("features");
        if (features.isObject() && (features.has("accessPoint") || features.has("radios"))) {
            return true;
        }
        if (features.isArray()) {
            for (JsonNode feature : features) {
                String value = feature.asText("").toLowerCase(Locale.ROOT);
                if (value.contains("accesspoint") || value.contains("access_point") || value.contains("wireless")) {
                    return true;
                }
            }
        }
        String model = device.path("model").asText("").toUpperCase(Locale.ROOT);
        return model.startsWith("UAP") || model.startsWith("U6") || model.startsWith("U7")
                || model.contains("ACCESS POINT");
    }

    private boolean isHealthyState(String state) {
        return "ONLINE".equals(state);
    }

    private String alertLabel(String state) {
        return switch (state) {
            case "OFFLINE" -> "Apagada o sin conexión";
            case "CONNECTION_INTERRUPTED" -> "Conexión interrumpida";
            case "ISOLATED" -> "Antena aislada";
            case "UPDATING", "GETTING_READY", "ADOPTING", "PENDING_ADOPTION" -> "Requiere revisión";
            default -> "Estado anómalo";
        };
    }

    private String encodePathSegment(String value) {
        return URLEncoder.encode(value, StandardCharsets.UTF_8).replace("+", "%20");
    }
}
