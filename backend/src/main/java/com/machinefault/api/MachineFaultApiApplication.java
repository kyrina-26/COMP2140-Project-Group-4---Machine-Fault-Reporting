package com.machinefault.api;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableScheduling;

// Starts Spring Boot and enables scheduled jobs such as login-event cleanup.
@SpringBootApplication @EnableScheduling
public class MachineFaultApiApplication {
    public static void main(String[] args) {
        SpringApplication.run(MachineFaultApiApplication.class, args);
    }
}
