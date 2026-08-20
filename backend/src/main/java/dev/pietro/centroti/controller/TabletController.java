package dev.pietro.centroti.controller;

import java.util.List;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import dev.pietro.centroti.api.TabletFleetSummaryResponse;
import dev.pietro.centroti.api.TabletResponse;
import dev.pietro.centroti.service.TabletService;

@RestController
@RequestMapping("/api/tablets")
public class TabletController {

    private final TabletService service;

    public TabletController(TabletService service) {
        this.service = service;
    }

    @GetMapping
    public List<TabletResponse> findAll() {
        return service.findAll();
    }

    @GetMapping("/summary")
    public TabletFleetSummaryResponse summary() {
        return service.summary();
    }

    @GetMapping("/{id}")
    public TabletResponse findById(@PathVariable String id) {
        return service.findById(id);
    }

    @ExceptionHandler(IllegalArgumentException.class)
    ResponseEntity<String> notFound(IllegalArgumentException exception) {
        return ResponseEntity.notFound().build();
    }
}
