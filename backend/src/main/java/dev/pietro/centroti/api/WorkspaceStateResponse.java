package dev.pietro.centroti.api;

import java.time.Instant;

import com.fasterxml.jackson.databind.JsonNode;

public record WorkspaceStateResponse(JsonNode data, Instant updatedAt) {
}
