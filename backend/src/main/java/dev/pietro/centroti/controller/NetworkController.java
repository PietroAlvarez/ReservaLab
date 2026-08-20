package dev.pietro.centroti.controller;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import dev.pietro.centroti.api.NetworkOverviewResponse;
import dev.pietro.centroti.service.UniFiService;

@RestController
@RequestMapping("/api/network")
public class NetworkController {

    private final UniFiService uniFi;

    public NetworkController(UniFiService uniFi) {
        this.uniFi = uniFi;
    }

    @GetMapping("/overview")
    public NetworkOverviewResponse overview() {
        return uniFi.overview();
    }
}
