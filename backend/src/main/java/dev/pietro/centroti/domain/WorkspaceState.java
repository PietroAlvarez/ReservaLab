package dev.pietro.centroti.domain;

import java.time.Instant;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

@Entity
@Table(name = "workspace_state")
public class WorkspaceState {

    public static final long SINGLETON_ID = 1L;

    @Id
    private Long id;

    @Column(nullable = false, length = 1_000_000)
    private String payload;

    @Column(nullable = false)
    private Instant updatedAt;

    protected WorkspaceState() {
    }

    public WorkspaceState(String payload) {
        this.id = SINGLETON_ID;
        update(payload);
    }

    public void update(String payload) {
        this.payload = payload;
        this.updatedAt = Instant.now();
    }

    public Long getId() {
        return id;
    }

    public String getPayload() {
        return payload;
    }

    public Instant getUpdatedAt() {
        return updatedAt;
    }
}
