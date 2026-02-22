package com.example.turfBooking.dto;

import com.example.turfBooking.model.SupportTicket;
import jakarta.validation.constraints.NotBlank;
import lombok.Data;

import java.time.Instant;

@Data
public class SupportDtos {

    @Data
    public static class CreateTicketRequest {
        private Long bookingId;
        @NotBlank
        private String title;
        @NotBlank
        private String description;
    }

    @Data
    public static class TicketView {
        private Long id;
        private String title;
        private String description;
        private SupportTicket.TicketStatus status;
        private String adminResponse;
        private Instant createdAt;
        private Long bookingId;
        private UserDtos.UserSummary user;
    }
}
