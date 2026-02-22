package com.example.turfBooking.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.time.LocalDateTime;

@Data
public class MaintenanceDtos {

    @Data
    public static class BlockRequest {
        @NotNull
        private Long turfId;
        @NotBlank
        private String reason;
        @NotNull
        private LocalDateTime startAt;
        @NotNull
        private LocalDateTime endAt;
    }
}
