package com.example.turfBooking.controller;

import com.example.turfBooking.dto.MaintenanceDtos;
import com.example.turfBooking.model.MaintenanceBlock;
import com.example.turfBooking.model.Slot;
import com.example.turfBooking.model.Turf;
import com.example.turfBooking.model.User;
import com.example.turfBooking.repo.MaintenanceBlockRepository;
import com.example.turfBooking.repo.SlotRepository;
import com.example.turfBooking.repo.TurfRepository;
import com.example.turfBooking.repo.UserRepository;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.security.Principal;
import java.util.List;

@RestController
@RequestMapping("/api/maintenance")
@CrossOrigin
public class MaintenanceController {

    private final MaintenanceBlockRepository maintenanceRepository;
    private final TurfRepository turfRepository;
    private final SlotRepository slotRepository;
    private final UserRepository userRepository;

    public MaintenanceController(MaintenanceBlockRepository maintenanceRepository,
                                 TurfRepository turfRepository,
                                 SlotRepository slotRepository,
                                 UserRepository userRepository) {
        this.maintenanceRepository = maintenanceRepository;
        this.turfRepository = turfRepository;
        this.slotRepository = slotRepository;
        this.userRepository = userRepository;
    }

    @GetMapping("/{turfId}")
    public ResponseEntity<List<MaintenanceBlock>> list(@PathVariable Long turfId) {
        return ResponseEntity.ok(maintenanceRepository.findByTurfId(turfId));
    }

    @PreAuthorize("hasAnyRole('MANAGER','ADMIN')")
    @PostMapping
    public ResponseEntity<MaintenanceBlock> block(@Valid @RequestBody MaintenanceDtos.BlockRequest request,
                                                  Principal principal) {
        User actor = userRepository.findByEmail(principal.getName()).orElseThrow();
        Turf turf = turfRepository.findById(request.getTurfId()).orElseThrow();
        if (!canManage(actor, turf)) {
            return ResponseEntity.status(403).build();
        }
        if (!request.getEndAt().isAfter(request.getStartAt())) {
            return ResponseEntity.badRequest().build();
        }
        MaintenanceBlock block = MaintenanceBlock.builder()
                .turf(turf)
                .reason(request.getReason())
                .startAt(request.getStartAt())
                .endAt(request.getEndAt())
                .build();
        MaintenanceBlock saved = maintenanceRepository.save(block);
        slotRepository
                .findOverlappingSlots(turf, request.getStartAt(), request.getEndAt())
                .forEach(slot -> {
                    slot.setStatus(Slot.SlotStatus.HOLD);
                    slot.setHoldExpiresAt(request.getEndAt());
                    slotRepository.save(slot);
                });
        return ResponseEntity.ok(saved);
    }

    private boolean canManage(User user, Turf turf) {
        if (user.getRole() == User.UserRole.ADMIN) {
            return true;
        }
        return turf.getManagers().stream().anyMatch(manager -> manager.getId().equals(user.getId()));
    }
}
