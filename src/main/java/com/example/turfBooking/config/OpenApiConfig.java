package com.example.turfBooking.config;

import io.swagger.v3.oas.annotations.OpenAPIDefinition;
import io.swagger.v3.oas.annotations.info.Info;
import org.springframework.context.annotation.Configuration;

@Configuration
@OpenAPIDefinition(
        info = @Info(
                title = "Turf Booking API",
                version = "1.0",
                description = "Simple turf booking backend for demo/testing"
        )
)
public class OpenApiConfig {
}

