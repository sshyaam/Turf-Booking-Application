package com.example.turfBooking.model;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;

@Entity
@Table(name = "users")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class User {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(unique = true)
    private String email;

    @Column(unique = true)
    private String phone;

    @Column(nullable = false)
    private String passwordHash;

    @Column(nullable = false, length = 120)
    private String fullName;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private UserStatus status;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private UserRole role;

    @Column(nullable = false, updatable = false)
    private Instant createdAt;

    @Column(nullable = false)
    private Instant updatedAt;

    @PrePersist
    public void onCreate() {
        Instant now = Instant.now();
        if (createdAt == null) {
            createdAt = now;
        }
        if (updatedAt == null) {
            updatedAt = now;
        }
        if (status == null) {
            status = UserStatus.ACTIVE;
        }
        if (role == null) {
            role = UserRole.USER;
        }
        phone = normalizePhone(phone);
    }

    @PreUpdate
    public void onUpdate() {
        this.updatedAt = Instant.now();
        phone = normalizePhone(phone);
    }

    public enum UserStatus {
        ACTIVE, SUSPENDED, DELETED
    }

    public enum UserRole {
        USER, MANAGER, ADMIN
    }

    private String normalizePhone(String value) {
        if (value == null || value.isBlank()) {
            return null;
        }
        String digits = value.replaceAll("[^0-9+]", "");
        if (digits.isBlank()) {
            return null;
        }
        if (digits.startsWith("00")) {
            return "+" + digits.substring(2);
        }
        return digits;
    }
}
