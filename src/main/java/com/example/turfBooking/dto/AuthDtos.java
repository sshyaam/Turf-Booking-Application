package com.example.turfBooking.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class AuthDtos {

    @Data
    public static class RegisterRequest {
        @Email
        @NotBlank
        private String email;

        @NotBlank
        private String password;

        @NotBlank
        private String fullName;

        private String phone;
    }

    @Data
    public static class LoginRequest {
        @NotBlank
        private String emailOrPhone;

        @NotBlank
        private String password;
    }

    @Data
    public static class AuthResponse {
        private String token;
        private Long userId;
        private String fullName;
        private String role;
    }
}

