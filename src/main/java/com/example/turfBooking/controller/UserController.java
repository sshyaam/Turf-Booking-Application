package com.example.turfBooking.controller;

import com.example.turfBooking.dto.UserDtos;
import com.example.turfBooking.model.User;
import com.example.turfBooking.repo.UserRepository;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.Optional;

@RestController
@RequestMapping("/api/users")
@CrossOrigin
public class UserController {

    private final UserRepository userRepository;

    public UserController(UserRepository userRepository) {
        this.userRepository = userRepository;
    }

    @GetMapping("/lookup")
    @PreAuthorize("hasAnyRole('USER','MANAGER','ADMIN')")
    public ResponseEntity<UserDtos.UserSummary> lookup(@RequestParam("identity") String identity) {
        if (identity == null || identity.isBlank()) {
            return ResponseEntity.badRequest().build();
        }
        String trimmed = identity.trim();
        Optional<User> candidate = trimmed.contains("@")
                ? userRepository.findByEmailIgnoreCase(trimmed)
                : userRepository.findByPhone(normalizePhone(trimmed));
        return candidate
                .map(this::toSummary)
                .map(ResponseEntity::ok)
                .orElseGet(() -> ResponseEntity.notFound().build());
    }

    private String normalizePhone(String value) {
        String digits = value.replaceAll("[^0-9+]", "");
        if (digits.startsWith("00")) {
            return "+" + digits.substring(2);
        }
        return digits;
    }

    private UserDtos.UserSummary toSummary(User user) {
        UserDtos.UserSummary summary = new UserDtos.UserSummary();
        summary.setId(user.getId());
        summary.setEmail(user.getEmail());
        summary.setPhone(user.getPhone());
        summary.setFullName(user.getFullName());
        summary.setRole(user.getRole().name());
        summary.setStatus(user.getStatus().name());
        return summary;
    }
}
