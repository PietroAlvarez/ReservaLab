package dev.pietro.centroti.repository;

import org.springframework.data.jpa.repository.JpaRepository;

import dev.pietro.centroti.domain.WorkspaceState;

public interface WorkspaceStateRepository extends JpaRepository<WorkspaceState, Long> {
}
