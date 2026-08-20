package dev.pietro.centroti;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.context.properties.EnableConfigurationProperties;

import dev.pietro.centroti.config.UniFiProperties;

@SpringBootApplication
@EnableConfigurationProperties(UniFiProperties.class)
public class CentroTiApplication {

    public static void main(String[] args) {
        SpringApplication.run(CentroTiApplication.class, args);
    }
}
