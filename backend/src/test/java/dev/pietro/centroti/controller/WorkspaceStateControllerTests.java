package dev.pietro.centroti.controller;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

@SpringBootTest
@AutoConfigureMockMvc
class WorkspaceStateControllerTests {

    @Autowired
    private MockMvc mvc;

    @Test
    void storesAndReturnsTheUnifiedWorkspace() throws Exception {
        String payload = """
                {
                  "reservations": [],
                  "tasks": [{"id": 1, "title": "Revisar red"}],
                  "assets": [],
                  "tablets": [],
                  "tabletLoans": []
                }
                """;

        mvc.perform(put("/api/workspace").contentType(MediaType.APPLICATION_JSON).content(payload))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.tasks[0].title").value("Revisar red"));

        mvc.perform(get("/api/workspace"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.tasks[0].title").value("Revisar red"));
    }

    @Test
    void rejectsIncompleteWorkspace() throws Exception {
        mvc.perform(put("/api/workspace").contentType(MediaType.APPLICATION_JSON).content("{\"tasks\":[]}"))
                .andExpect(status().isBadRequest());
    }
}
