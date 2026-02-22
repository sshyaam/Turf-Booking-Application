package com.example.turfBooking.controller;

import com.example.turfBooking.dto.SupportDtos;
import com.example.turfBooking.dto.UserDtos;
import com.example.turfBooking.model.Booking;
import com.example.turfBooking.model.SupportTicket;
import com.example.turfBooking.model.User;
import com.example.turfBooking.repo.BookingRepository;
import com.example.turfBooking.repo.SupportTicketRepository;
import com.example.turfBooking.repo.UserRepository;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.security.Principal;
import java.util.List;

@RestController
@RequestMapping("/api/support")
@CrossOrigin
public class SupportController {

    private final SupportTicketRepository supportTicketRepository;
    private final UserRepository userRepository;
    private final BookingRepository bookingRepository;

    public SupportController(SupportTicketRepository supportTicketRepository,
                             UserRepository userRepository,
                             BookingRepository bookingRepository) {
        this.supportTicketRepository = supportTicketRepository;
        this.userRepository = userRepository;
        this.bookingRepository = bookingRepository;
    }

    @PostMapping("/tickets")
    public ResponseEntity<SupportDtos.TicketView> create(@Valid @RequestBody SupportDtos.CreateTicketRequest request,
                                                         Principal principal) {
        User user = userRepository.findByEmail(principal.getName()).orElseThrow();
        Booking booking = null;
        if (request.getBookingId() != null) {
            booking = bookingRepository.findById(request.getBookingId()).orElse(null);
        }
        SupportTicket ticket = SupportTicket.builder()
                .user(user)
                .booking(booking)
                .title(request.getTitle())
                .description(request.getDescription())
                .build();
        return ResponseEntity.ok(toView(supportTicketRepository.save(ticket)));
    }

    @GetMapping("/tickets/me")
    public ResponseEntity<List<SupportDtos.TicketView>> myTickets(Principal principal) {
        User user = userRepository.findByEmail(principal.getName()).orElseThrow();
        return ResponseEntity.ok(
                supportTicketRepository.findByUser(user).stream().map(this::toView).toList()
        );
    }

    @PreAuthorize("hasRole('ADMIN')")
    @GetMapping("/tickets")
    public ResponseEntity<List<SupportDtos.TicketView>> allTickets() {
        return ResponseEntity.ok(
                supportTicketRepository.findAll().stream().map(this::toView).toList()
        );
    }

    @PreAuthorize("hasRole('ADMIN')")
    @PostMapping("/tickets/{id}/respond")
    public ResponseEntity<SupportDtos.TicketView> respond(@PathVariable Long id,
                                                          @RequestParam String responseText,
                                                          @RequestParam(defaultValue = "IN_PROGRESS") SupportTicket.TicketStatus status) {
        SupportTicket ticket = supportTicketRepository.findById(id).orElseThrow();
        ticket.setAdminResponse(responseText);
        ticket.setStatus(status);
        return ResponseEntity.ok(toView(supportTicketRepository.save(ticket)));
    }

    private SupportDtos.TicketView toView(SupportTicket ticket) {
        SupportDtos.TicketView view = new SupportDtos.TicketView();
        view.setId(ticket.getId());
        view.setTitle(ticket.getTitle());
        view.setDescription(ticket.getDescription());
        view.setStatus(ticket.getStatus());
        view.setAdminResponse(ticket.getAdminResponse());
        view.setCreatedAt(ticket.getCreatedAt());
        view.setBookingId(ticket.getBooking() != null ? ticket.getBooking().getId() : null);
        view.setUser(toSummary(ticket.getUser()));
        return view;
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

