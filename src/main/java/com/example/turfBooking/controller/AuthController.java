package com.example.turfBooking.controller;

import com.example.turfBooking.dto.AuthDtos;
import com.example.turfBooking.model.User;
import com.example.turfBooking.repo.UserRepository;
import com.example.turfBooking.security.JwtUtil;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;

import java.util.Map;
import java.util.regex.Pattern;

@RestController
@RequestMapping("/api/auth")
@CrossOrigin
public class AuthController {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtUtil jwtUtil;

    public AuthController(UserRepository userRepository,
                          PasswordEncoder passwordEncoder,
                          JwtUtil jwtUtil) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.jwtUtil = jwtUtil;
    }

    private static final Pattern PASSWORD_PATTERN = Pattern.compile("^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d).{6,}$");

    @PostMapping("/register")
    public ResponseEntity<?> register(@Valid @RequestBody AuthDtos.RegisterRequest request) {
        if (!PASSWORD_PATTERN.matcher(request.getPassword()).matches()) {
            return ResponseEntity.badRequest()
                    .body("Password must be at least 6 characters with upper, lower, and number.");
        }
        if (userRepository.findByEmailIgnoreCase(request.getEmail()).isPresent()) {
            return ResponseEntity.badRequest().body("Email already registered");
        }
        String normalizedPhone = normalizePhone(request.getPhone());
        if (normalizedPhone != null && userRepository.findByPhone(normalizedPhone).isPresent()) {
            return ResponseEntity.badRequest().body("Phone already registered");
        }
        User user = User.builder()
                .email(request.getEmail())
                .phone(normalizedPhone)
                .fullName(request.getFullName())
                .passwordHash(passwordEncoder.encode(request.getPassword()))
                .role(User.UserRole.USER)
                .build();
        userRepository.save(user);
        return ResponseEntity.ok("Registered");
    }

    @PostMapping("/login")
    public ResponseEntity<?> login(@Valid @RequestBody AuthDtos.LoginRequest request) {
        User user = userRepository.findByEmail(request.getEmailOrPhone())
                .or(() -> userRepository.findByPhone(request.getEmailOrPhone()))
                .orElse(null);
        if (user == null) {
            return ResponseEntity.status(401).body("Invalid credentials");
        }
        if (!passwordEncoder.matches(request.getPassword(), user.getPasswordHash())) {
            return ResponseEntity.status(401).body("Invalid credentials");
        }
        String token = jwtUtil.generateToken(
                user.getEmail(),
                Map.of("role", user.getRole().name(), "userId", user.getId())
        );
        AuthDtos.AuthResponse resp = new AuthDtos.AuthResponse();
        resp.setToken(token);
        resp.setUserId(user.getId());
        resp.setFullName(user.getFullName());
        resp.setRole(user.getRole().name());
        return ResponseEntity.ok(resp);
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
