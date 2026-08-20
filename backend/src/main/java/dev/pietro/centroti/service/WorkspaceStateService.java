package dev.pietro.centroti.service;

import java.util.Optional;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;

import dev.pietro.centroti.api.WorkspaceStateResponse;
import dev.pietro.centroti.domain.WorkspaceState;
import dev.pietro.centroti.repository.WorkspaceStateRepository;

@Service
public class WorkspaceStateService {

    private static final int MAX_PAYLOAD_BYTES = 900_000;

    private final WorkspaceStateRepository states;
    private final ObjectMapper objectMapper;

    public WorkspaceStateService(WorkspaceStateRepository states, ObjectMapper objectMapper) {
        this.states = states;
        this.objectMapper = objectMapper;
    }

    @Transactional(readOnly = true)
    public Optional<WorkspaceStateResponse> find() {
        return states.findById(WorkspaceState.SINGLETON_ID).map(this::toResponse);
    }

    @Transactional
    public WorkspaceStateResponse save(JsonNode data) {
        validate(data);
        try {
            String payload = objectMapper.writeValueAsString(data);
            if (payload.getBytes(java.nio.charset.StandardCharsets.UTF_8).length > MAX_PAYLOAD_BYTES) {
                throw new IllegalArgumentException("El estado supera el tamaño máximo permitido");
            }
            WorkspaceState state = states.findById(WorkspaceState.SINGLETON_ID)
                    .orElseGet(() -> new WorkspaceState(payload));
            state.update(payload);
            return toResponse(states.save(state));
        } catch (JsonProcessingException exception) {
            throw new IllegalArgumentException("El estado no contiene JSON válido", exception);
        }
    }

    @Transactional
    public void clear() {
        states.deleteById(WorkspaceState.SINGLETON_ID);
    }

    private void validate(JsonNode data) {
        if (data == null || !data.isObject()) {
            throw new IllegalArgumentException("El estado debe ser un objeto JSON");
        }
        for (String collection : java.util.List.of("reservations", "tasks", "assets", "tablets", "tabletLoans")) {
            JsonNode value = data.get(collection);
            if (value == null || !value.isArray()) {
                throw new IllegalArgumentException("Falta la colección requerida: " + collection);
            }
        }
    }

    private WorkspaceStateResponse toResponse(WorkspaceState state) {
        try {
            return new WorkspaceStateResponse(objectMapper.readTree(state.getPayload()), state.getUpdatedAt());
        } catch (JsonProcessingException exception) {
            throw new IllegalStateException("El estado persistido está dañado", exception);
        }
    }
}
