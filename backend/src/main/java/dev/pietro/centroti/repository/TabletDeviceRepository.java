package dev.pietro.centroti.repository;

import java.util.List;

import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;

import dev.pietro.centroti.domain.TabletDevice;

public interface TabletDeviceRepository extends JpaRepository<TabletDevice, String> {

    @Override
    @EntityGraph(attributePaths = "installedApps")
    List<TabletDevice> findAll();

    @EntityGraph(attributePaths = "installedApps")
    java.util.Optional<TabletDevice> findWithInstalledAppsById(String id);
}
