package com.example.turfBooking.dto;

import lombok.Data;

public class UserDtos {

    private UserDtos() {
        // utility holder
    }

    @Data
    public static class UserSummary {
        private Long id;
        private String email;
        private String phone;
        private String fullName;
        private String role;
        private String status;
    }
}
