package com.example.turfBooking.controller;

import com.example.turfBooking.dto.TurfDtos;
import com.example.turfBooking.model.Turf;
import com.example.turfBooking.model.TurfImage;
import com.example.turfBooking.model.User;
import com.example.turfBooking.repo.TurfRepository;
import com.example.turfBooking.repo.UserRepository;
import jakarta.transaction.Transactional;
import jakarta.validation.Valid;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.time.LocalTime;
import java.time.temporal.ChronoUnit;
import java.util.HashMap;
import java.util.List;
import java.util.Locale;
import java.security.Principal;

@RestController
@RequestMapping("/api/turfs")
@CrossOrigin
public class TurfController {

    private final TurfRepository turfRepository;
    private final UserRepository userRepository;

    public TurfController(TurfRepository turfRepository, UserRepository userRepository) {
        this.turfRepository = turfRepository;
        this.userRepository = userRepository;
    }

    @PostMapping
    @Transactional
    public ResponseEntity<Turf> createTurf(@Valid @RequestBody TurfDtos.TurfCreateRequest request,
                                           Principal principal) {
        User creator = userRepository.findByEmail(principal.getName()).orElseThrow();
        if (invalidOperatingWindow(request.getOpenTime(), request.getCloseTime())) {
            return ResponseEntity.badRequest().build();
        }

        Turf turf = Turf.builder()
                .name(request.getName())
                .city(request.getCity())
                .state(request.getState())
                .pincode(request.getPincode())
                .openTime(request.getOpenTime())
                .closeTime(request.getCloseTime())
                .sports(request.getSports())
                .amenities(request.getAmenities())
                .hourlyPrice(request.getHourlyPrice() != null ? request.getHourlyPrice() : 0L)
                .customPricing(request.getCustomPricing() != null ? request.getCustomPricing() : new HashMap<>())
                .status(Turf.TurfStatus.PENDING)
                .build();
        ensureManagerRole(creator);
        turf.getManagers().add(creator);

        if (request.getManagers() != null && !request.getManagers().isEmpty()) {
            for (TurfDtos.ManagerContact managerContact : request.getManagers()) {
                if (managerContact == null || managerContact.getContact() == null || managerContact.getContact().isBlank()) {
                    return ResponseEntity.badRequest().build();
                }
                ManagerContactType type = resolveContactType(managerContact);
                if (type == null) {
                    return ResponseEntity.badRequest().build();
                }
                User manager = findManagerByContact(managerContact, type);
                if (manager == null) {
                    return ResponseEntity.notFound().build();
                }
                if (manager.getId().equals(creator.getId())) {
                    return ResponseEntity.badRequest().build();
                }
                if (isAlreadyManager(turf, manager)) {
                    continue;
                }
                ensureManagerRole(manager);
                turf.getManagers().add(manager);
            }
        }

        return ResponseEntity.ok(turfRepository.save(turf));
    }

    @PreAuthorize("hasAnyRole('MANAGER','ADMIN')")
    @PostMapping("/{id}/images")
    public ResponseEntity<Turf> uploadImage(@PathVariable Long id,
                                            @RequestParam("file") MultipartFile file) throws IOException {
        Turf turf = turfRepository.findById(id).orElseThrow();
        if (file.isEmpty()) {
            return ResponseEntity.badRequest().build();
        }
        byte[] bytes = file.getBytes();
        if (bytes.length == 0) {
            return ResponseEntity.badRequest().build();
        }
        TurfImage image = TurfImage.builder()
                .turf(turf)
                .data(bytes)
                .mimeType(file.getContentType() != null ? file.getContentType() : "application/octet-stream")
                .fileName(file.getOriginalFilename())
                .build();
        turf.getPhotos().add(image);
        return ResponseEntity.ok(turfRepository.save(turf));
    }

    @PostMapping("/search")
    public ResponseEntity<Page<Turf>> search(@RequestBody TurfDtos.TurfSearchRequest request) {
        PageRequest page = PageRequest.of(request.getPage(), request.getSize());
        Page<Turf> result = turfRepository.search(
                emptyToNull(request.getCity()),
                emptyToNull(request.getPincode()),
                emptyToNull(request.getSport()),
                emptyToNull(request.getAmenity()),
                page
        );
        return ResponseEntity.ok(result);
    }

    @GetMapping("/{id}")
    public ResponseEntity<Turf> findOne(@PathVariable Long id) {
        return ResponseEntity.of(turfRepository.findById(id));
    }

    @PreAuthorize("hasAnyRole('USER','MANAGER','ADMIN')")
    @GetMapping("/mine")
    public ResponseEntity<List<Turf>> myTurfs(Principal principal) {
        User me = userRepository.findByEmail(principal.getName()).orElseThrow();
        return ResponseEntity.ok(turfRepository.findDistinctByManagers_Id(me.getId()));
    }

    @PreAuthorize("hasRole('ADMIN')")
    @GetMapping("/managed")
    public ResponseEntity<List<Turf>> allManaged() {
        return ResponseEntity.ok(turfRepository.findAll());
    }

    @PreAuthorize("hasRole('ADMIN')")
    @PostMapping("/{id}/approve")
    public ResponseEntity<Turf> approve(@PathVariable Long id) {
        Turf turf = turfRepository.findById(id).orElseThrow();
        turf.setStatus(Turf.TurfStatus.APPROVED);
        return ResponseEntity.ok(turfRepository.save(turf));
    }

    @PreAuthorize("hasRole('ADMIN')")
    @PostMapping("/{id}/reject")
    public ResponseEntity<Turf> reject(@PathVariable Long id) {
        Turf turf = turfRepository.findById(id).orElseThrow();
        turf.setStatus(Turf.TurfStatus.SUSPENDED);
        return ResponseEntity.ok(turfRepository.save(turf));
    }

    private String emptyToNull(String value) {
        return (value == null || value.isBlank()) ? null : value;
    }

    private boolean invalidOperatingWindow(LocalTime openTime, LocalTime closeTime) {
        if (openTime == null || closeTime == null) {
            return false;
        }
        long minutesDiff = ChronoUnit.MINUTES.between(openTime, closeTime);
        return minutesDiff < 60;
    }

    private boolean isAlreadyManager(Turf turf, User candidate) {
        return turf.getManagers().stream().anyMatch(existing -> existing.getId().equals(candidate.getId()));
    }

    private void ensureManagerRole(User user) {
        if (user.getRole() == User.UserRole.USER) {
            user.setRole(User.UserRole.MANAGER);
            userRepository.save(user);
        }
    }

    private ManagerContactType resolveContactType(TurfDtos.ManagerContact contact) {
        String declared = contact.getType();
        if (declared != null && !declared.isBlank()) {
            return switch (declared.toLowerCase(Locale.ROOT)) {
                case "email" -> ManagerContactType.EMAIL;
                case "phone" -> ManagerContactType.PHONE;
                default -> null;
            };
        }
        return contact.getContact() != null && contact.getContact().contains("@")
                ? ManagerContactType.EMAIL
                : ManagerContactType.PHONE;
    }

    private User findManagerByContact(TurfDtos.ManagerContact contact, ManagerContactType type) {
        if (type == ManagerContactType.EMAIL) {
            return userRepository.findByEmailIgnoreCase(contact.getContact()).orElse(null);
        }
        String normalized = normalizeDigits(contact.getContact());
        if (normalized.isBlank()) {
            return null;
        }
        return userRepository.findByPhone(normalized).orElse(null);
    }

    private String normalizeDigits(String value) {
        if (value == null) {
            return "";
        }
        return value.replaceAll("[^0-9+]", "");
    }

    private enum ManagerContactType {
        EMAIL,
        PHONE
    }
}
