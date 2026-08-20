package dev.pietro.centroti.controller;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.fasterxml.jackson.databind.JsonNode;

import dev.pietro.centroti.api.WorkspaceStateResponse;
import dev.pietro.centroti.service.WorkspaceStateService;

@RestController
@RequestMapping("/api/workspace")
public class WorkspaceStateController {

    private final WorkspaceStateService service;

    public WorkspaceStateController(WorkspaceStateService service) {
        this.service = service;
    }

    @GetMapping
    public ResponseEntity<WorkspaceStateResponse> find() {
        return service.find().map(ResponseEntity::ok).orElseGet(() -> ResponseEntity.noContent().build());
    }

    @PutMapping
    public WorkspaceStateResponse save(@RequestBody JsonNode data) {
        return service.save(data);
    }

    @DeleteMapping
    public ResponseEntity<Void> clear() {
        service.clear();
        return ResponseEntity.noContent().build();
    }

    @ExceptionHandler(IllegalArgumentException.class)
    ResponseEntity<String> invalidState(IllegalArgumentException exception) {
        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(exception.getMessage());
    }
}
