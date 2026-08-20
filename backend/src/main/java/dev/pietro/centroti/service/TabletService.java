package dev.pietro.centroti.service;

import java.util.List;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import dev.pietro.centroti.api.TabletFleetSummaryResponse;
import dev.pietro.centroti.api.TabletResponse;
import dev.pietro.centroti.repository.TabletDeviceRepository;

@Service
@Transactional(readOnly = true)
public class TabletService {

    private final TabletDeviceRepository tablets;

    public TabletService(TabletDeviceRepository tablets) {
        this.tablets = tablets;
    }

    public List<TabletResponse> findAll() {
        return tablets.findAll().stream().map(tablet -> TabletResponse.from(tablet, false)).toList();
    }

    public TabletResponse findById(String id) {
        return tablets.findWithInstalledAppsById(id)
                .map(tablet -> TabletResponse.from(tablet, true))
                .orElseThrow(() -> new IllegalArgumentException("Tablet no encontrada: " + id));
    }

    public TabletFleetSummaryResponse summary() {
        var devices = tablets.findAll().stream().map(tablet -> TabletResponse.from(tablet, false)).toList();
        int compliant = (int) devices.stream().filter(TabletResponse::compliant).count();
        int apps = devices.stream().mapToInt(TabletResponse::installedAppCount).sum();
        int unapproved = devices.stream().mapToInt(TabletResponse::unapprovedAppCount).sum();
        int outdated = devices.stream().mapToInt(TabletResponse::outdatedAppCount).sum();
        return new TabletFleetSummaryResponse(
                devices.size(), compliant, devices.size() - compliant,
                apps, unapproved, outdated,
                "REPORT_ONLY",
                "El servidor evalúa inventario y cumplimiento. Aplicar restricciones requiere un agente Android o Intune.");
    }
}
