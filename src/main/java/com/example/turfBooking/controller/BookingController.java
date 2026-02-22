package com.example.turfBooking.controller;

import com.example.turfBooking.dto.BookingDtos;
import com.example.turfBooking.model.*;
import com.example.turfBooking.repo.*;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import org.springframework.transaction.annotation.Transactional;

import java.security.Principal;
import java.time.Duration;
import java.time.Instant;
import java.time.LocalDateTime;
import java.util.Comparator;
import java.util.List;
import java.util.Locale;

@RestController
@RequestMapping("/api/bookings")
@CrossOrigin
public class BookingController {

    private final SlotRepository slotRepository;
    private final TurfRepository turfRepository;
    private final BookingRepository bookingRepository;
    private final UserRepository userRepository;
    private final NotificationRepository notificationRepository;
    private final BookingInviteRepository inviteRepository;
    private final BookingExtensionRepository extensionRepository;
    private final BookingTransactionRepository transactionRepository;

    public BookingController(SlotRepository slotRepository,
                             TurfRepository turfRepository,
                             BookingRepository bookingRepository,
                             UserRepository userRepository,
                             NotificationRepository notificationRepository,
                             BookingInviteRepository inviteRepository,
                             BookingExtensionRepository extensionRepository,
                             BookingTransactionRepository transactionRepository) {
        this.slotRepository = slotRepository;
        this.turfRepository = turfRepository;
        this.bookingRepository = bookingRepository;
        this.userRepository = userRepository;
        this.notificationRepository = notificationRepository;
        this.inviteRepository = inviteRepository;
        this.extensionRepository = extensionRepository;
        this.transactionRepository = transactionRepository;
    }

    // Manager creates slot (you could extend to recurring later)
    @PostMapping("/slots")
    @Transactional
    public ResponseEntity<Slot> createSlot(@Valid @RequestBody BookingDtos.CreateSlotRequest request) {
        Turf turf = turfRepository.findById(request.getTurfId()).orElseThrow();
        LocalDateTime now = LocalDateTime.now();
        if (request.getStartAt().isBefore(now) || request.getEndAt().isBefore(now) || !request.getEndAt().isAfter(request.getStartAt())) {
            return ResponseEntity.badRequest().build();
        }
        Slot slot = Slot.builder()
                .turf(turf)
                .sport(request.getSport())
                .amenity(request.getAmenity())
                .startAt(request.getStartAt())
                .endAt(request.getEndAt())
                .price(request.getPrice())
                .status(Slot.SlotStatus.FREE)
                .build();
        return ResponseEntity.ok(slotRepository.save(slot));
    }

    // View slots for a turf (simple calendar)
    @GetMapping("/slots/{turfId}")
    public ResponseEntity<List<Slot>> getSlots(@PathVariable Long turfId) {
        return ResponseEntity.ok(slotRepository.findByTurfId(turfId));
    }

    // User books a slot (payment is simulated, always success)
    @PostMapping("/book")
    @Transactional
    public ResponseEntity<List<BookingDtos.MyBookingView>> book(@Valid @RequestBody BookingDtos.BookSlotRequest request,
                                                                Principal principal) {
        User user = userRepository.findByEmail(principal.getName()).orElseThrow();
        List<Long> slotIds = request.allSlotIds();
        if (slotIds.isEmpty()) {
            return ResponseEntity.badRequest().build();
        }
        List<Slot> slots = slotRepository.findAllById(slotIds);
        if (slots.size() != slotIds.size()) {
            return ResponseEntity.notFound().build();
        }
        List<Slot> ordered = slots.stream()
                .sorted(Comparator.comparing(Slot::getStartAt))
                .toList();
        Slot first = ordered.get(0);
        Long turfId = first.getTurf().getId();
        LocalDateTime now = LocalDateTime.now();
        for (int i = 0; i < ordered.size(); i++) {
            Slot current = ordered.get(i);
            if (!current.getTurf().getId().equals(turfId)) {
                return ResponseEntity.badRequest().build();
            }
            if (!current.getStartAt().toLocalDate().equals(first.getStartAt().toLocalDate())) {
                return ResponseEntity.status(409).build();
            }
            if (current.getStatus() != Slot.SlotStatus.FREE) {
                return ResponseEntity.status(409).build();
            }
            if (!current.getStartAt().isAfter(now)) {
                return ResponseEntity.status(409).build();
            }
            if (i > 0) {
                Slot previous = ordered.get(i - 1);
                if (!current.getStartAt().equals(previous.getEndAt())) {
                    return ResponseEntity.badRequest().build();
                }
                if (!equalsIgnoreCase(current.getAmenity(), previous.getAmenity())
                        || !equalsIgnoreCase(current.getSport(), previous.getSport())) {
                    return ResponseEntity.badRequest().build();
                }
            }
        }
        long totalPrice = ordered.stream().mapToLong(slot -> slot.getPrice() == null ? 0L : slot.getPrice()).sum();
        Booking booking = Booking.builder()
                .user(user)
                .turf(first.getTurf())
                .slot(first)
                .status(Booking.BookingStatus.CONFIRMED)
                .paymentStatus(Booking.PaymentStatus.PAID)
                .priceCents(totalPrice)
                .refundable(request.isRefundable())
                .build();
        bookingRepository.saveAndFlush(booking);
        for (Slot slot : ordered) {
            slot.setStatus(Slot.SlotStatus.BOOKED);
            slot.setBooking(booking);
            slotRepository.save(slot);
        }
        Notification notification = Notification.builder()
                .user(user)
                .type(Notification.NotificationType.BOOKING)
                .message("Booking confirmed for turf " + first.getTurf().getName())
                .build();
        notificationRepository.save(notification);
        recordTransaction(booking, user, BookingTransaction.TransactionType.BOOKED,
                "Booked " + describeWindow(booking));
        booking.setRole("OWNER");
        return ResponseEntity.ok(List.of(toView(booking, "OWNER")));
    }

    // Cancel with refund rule: 100% before 24h, 50% after (if refundable)
    @PostMapping("/cancel")
    @Transactional
    public ResponseEntity<BookingDtos.MyBookingView> cancel(@Valid @RequestBody BookingDtos.CancelBookingRequest request,
                                                            Principal principal) {
        User user = userRepository.findByEmail(principal.getName()).orElseThrow();
        Booking booking = bookingRepository.findById(request.getBookingId()).orElseThrow();
        if (!booking.getUser().getId().equals(user.getId())) {
            return ResponseEntity.status(403).build();
        }
        if (!booking.isRefundable()) {
            return ResponseEntity.badRequest().body(toView(booking, "OWNER"));
        }

        LocalDateTime now = LocalDateTime.now();
        LocalDateTime slotStart = bookingStart(booking);
        if (slotStart == null) {
            return ResponseEntity.badRequest().build();
        }
        long hoursDiff = Duration.between(now, slotStart).toHours();

        long refund;
        if (hoursDiff >= 24) {
            refund = booking.getPriceCents(); // 100%
        } else {
            refund = booking.getPriceCents() / 2; // 50%
        }
        booking.setRefundedAmountCents(refund);
        booking.setStatus(Booking.BookingStatus.CANCELLED);
        booking.setPaymentStatus(
                refund == booking.getPriceCents()
                        ? Booking.PaymentStatus.REFUNDED
                        : Booking.PaymentStatus.PARTIAL_REFUND
        );
        bookingRepository.save(booking);
        List<Slot> bookingSlots = slotRepository.findByBooking(booking);
        if (bookingSlots.isEmpty() && booking.getSlot() != null) {
            bookingSlots = List.of(booking.getSlot());
        }
        for (Slot slot : bookingSlots) {
            slot.setStatus(Slot.SlotStatus.FREE);
            slot.setBooking(null);
            slotRepository.save(slot);
        }
        inviteRepository.findByBooking(booking).forEach(invite -> {
            invite.setStatus(BookingInvite.InviteStatus.CANCELLED);
            inviteRepository.save(invite);
        });

        Notification n = Notification.builder()
                .user(user)
                .type(Notification.NotificationType.REFUND)
                .message("Refund started for booking " + booking.getId() + ", amount: " + refund)
                .build();
        notificationRepository.save(n);
        recordTransaction(booking, user, BookingTransaction.TransactionType.CANCELLED,
                "Cancelled booking; refund " + refund);

        booking.setRole("OWNER");
        return ResponseEntity.ok(toView(booking, "OWNER"));
    }

    @GetMapping("/mine")
    public ResponseEntity<List<BookingDtos.MyBookingView>> mine(Principal principal) {
        User user = userRepository.findByEmail(principal.getName()).orElseThrow();
        List<BookingDtos.MyBookingView> owned = bookingRepository.findByUser(user).stream()
                .map(booking -> toView(booking, "OWNER"))
                .toList();
        List<BookingDtos.MyBookingView> guest = inviteRepository
                .findByInvitedUserAndStatus(user, BookingInvite.InviteStatus.ACCEPTED)
                .stream()
                .map(invite -> toView(invite.getBooking(), "GUEST"))
                .toList();
        List<BookingDtos.MyBookingView> combined = new java.util.ArrayList<>(owned);
        combined.addAll(guest);
        return ResponseEntity.ok(combined);
    }

    @PostMapping("/{bookingId}/invites")
    @Transactional
    public ResponseEntity<BookingDtos.InviteView> invite(@PathVariable Long bookingId,
                                                         @Valid @RequestBody BookingDtos.InviteRequest request,
                                                         Principal principal) {
        Booking booking = bookingRepository.findById(bookingId).orElseThrow();
        User inviter = userRepository.findByEmail(principal.getName()).orElseThrow();
        if (!booking.getUser().getId().equals(inviter.getId())) {
            return ResponseEntity.status(403).build();
        }
        BookingInvite.InviteType contactType = resolveType(request.getContact(), request.getType());
        if (isSelfContact(inviter, request.getContact(), contactType)) {
            return ResponseEntity.badRequest().build();
        }
        User match = matchUser(request.getContact(), contactType);
        if (match == null) {
            return ResponseEntity.status(404).build();
        }

        // Prevent self-invites
        if (match.getId().equals(inviter.getId())) {
            return ResponseEntity.badRequest().build();
        }
        
        String contactValue = canonicalContact(match, contactType);
        if (contactValue == null) {
            return ResponseEntity.badRequest().build();
        }
        if (inviteRepository.existsByBookingAndContactIgnoreCase(booking, contactValue)) {
            return ResponseEntity.badRequest().build();
        }
        BookingInvite invite = BookingInvite.builder()
                .booking(booking)
                .invitedBy(inviter)
                .invitedUser(match)
                .contact(contactValue)
                .contactType(contactType)
                .build();
        inviteRepository.save(invite);
        recordTransaction(booking, inviter, BookingTransaction.TransactionType.INVITE_SENT,
                "Invite sent to " + contactValue);
        return ResponseEntity.ok(toInviteView(invite));
    }

    @GetMapping("/invites")
    public ResponseEntity<List<BookingDtos.InviteView>> pendingInvites(Principal principal) {
        User user = userRepository.findByEmail(principal.getName()).orElseThrow();
        List<BookingInvite> collected = new java.util.ArrayList<>();
        if (user.getEmail() != null) {
            collected.addAll(inviteRepository
                    .findByContactIgnoreCaseAndStatus(
                            canonicalContact(user, BookingInvite.InviteType.EMAIL),
                            BookingInvite.InviteStatus.SENT));
        }
        if (user.getPhone() != null) {
            collected.addAll(inviteRepository
                    .findByContactIgnoreCaseAndStatus(
                            canonicalContact(user, BookingInvite.InviteType.PHONE),
                            BookingInvite.InviteStatus.SENT));
        }
        java.util.LinkedHashMap<Long, BookingInvite> unique = new java.util.LinkedHashMap<>();
        collected.forEach(invite -> unique.put(invite.getId(), invite));
        return ResponseEntity.ok(unique.values().stream().map(this::toInviteView).toList());
    }

    @GetMapping("/extensions")
    public ResponseEntity<List<BookingDtos.ExtensionView>> extensions(
            @RequestParam(name = "scope", defaultValue = "mine") String scope,
            Principal principal) {
        User user = userRepository.findByEmail(principal.getName()).orElseThrow();
        if ("managed".equalsIgnoreCase(scope)) {
            List<Long> turfIds;
            if (user.getRole() == User.UserRole.ADMIN) {
                turfIds = turfRepository.findAll().stream().map(Turf::getId).toList();
            } else {
                turfIds = turfRepository.findDistinctByManagers_Id(user.getId()).stream()
                        .map(Turf::getId)
                        .toList();
            }
            if (turfIds.isEmpty()) {
                return ResponseEntity.ok(List.of());
            }
            return ResponseEntity.ok(
                    extensionRepository.findByBooking_Turf_IdIn(turfIds).stream()
                            .filter(ext -> ext.getStatus() == BookingExtension.ExtensionStatus.PENDING)
                            .map(this::toExtensionView)
                            .toList()
            );
        }
        return ResponseEntity.ok(
                extensionRepository.findByRequestedBy(user).stream().map(this::toExtensionView).toList()
        );
    }

    @PreAuthorize("hasAnyRole('MANAGER','ADMIN')")
    @PostMapping("/extensions/{extensionId}/decision")
    @Transactional
    public ResponseEntity<BookingDtos.ExtensionView> decideExtension(@PathVariable Long extensionId,
                                                                     @Valid @RequestBody BookingDtos.ExtensionDecisionRequest request,
                                                                     Principal principal) {
        User actor = userRepository.findByEmail(principal.getName()).orElseThrow();
        BookingExtension extension = extensionRepository.findById(extensionId).orElseThrow();
        Booking booking = extension.getBooking();
        if (!canManage(actor, booking.getTurf())) {
            return ResponseEntity.status(403).build();
        }
        if (extension.getStatus() != BookingExtension.ExtensionStatus.PENDING) {
            return ResponseEntity.status(409).build();
        }
        BookingExtension.ExtensionStatus decision = request.getDecision();
        if (decision == null || decision == BookingExtension.ExtensionStatus.PENDING) {
            return ResponseEntity.badRequest().build();
        }
        if (decision == BookingExtension.ExtensionStatus.APPROVED) {
            Slot slot = nextFreeSlot(booking);
            if (slot == null || slot.getStatus() != Slot.SlotStatus.FREE) {
                return ResponseEntity.status(409).build();
            }
            slot.setStatus(Slot.SlotStatus.BOOKED);
            slot.setBooking(booking);
            slotRepository.save(slot);
            booking.setPriceCents(booking.getPriceCents() + (slot.getPrice() == null ? 0L : slot.getPrice()));
            if (booking.getSlots() != null) {
                booking.getSlots().add(slot);
            }
            bookingRepository.save(booking);
            recordTransaction(booking, actor, BookingTransaction.TransactionType.EXTENSION_APPROVED,
                    "Extension approved +" + extension.getMinutes() + "m");
        } else {
            recordTransaction(booking, actor, BookingTransaction.TransactionType.EXTENSION_DECLINED,
                    "Extension declined +" + extension.getMinutes() + "m");
        }
        extension.setStatus(decision);
        extension.setRespondedAt(Instant.now());
        BookingExtension updated = extensionRepository.save(extension);
        return ResponseEntity.ok(toExtensionView(updated));
    }

    @PostMapping("/invites/{inviteId}/accept")
    @Transactional
    public ResponseEntity<BookingDtos.InviteView> acceptInvite(@PathVariable Long inviteId, Principal principal) {
        User user = userRepository.findByEmail(principal.getName()).orElseThrow();
        BookingInvite invite = inviteRepository.findByIdAndStatus(inviteId, BookingInvite.InviteStatus.SENT).orElse(null);
        if (invite == null) {
            return ResponseEntity.notFound().build();
        }
        if (!matchesUser(invite, user)) {
            return ResponseEntity.status(403).build();
        }
        invite.setInvitedUser(user);
        invite.setStatus(BookingInvite.InviteStatus.ACCEPTED);
        invite.setRespondedAt(Instant.now());
        inviteRepository.save(invite);
        recordTransaction(invite.getBooking(), user, BookingTransaction.TransactionType.INVITE_ACCEPTED,
                "Invite accepted by " + user.getFullName());
        return ResponseEntity.ok(toInviteView(invite));
    }

    @PostMapping("/{bookingId}/extend")
    @Transactional
    public ResponseEntity<BookingDtos.ExtensionView> extend(@PathVariable Long bookingId,
                                                            @Valid @RequestBody BookingDtos.ExtensionRequestDto dto,
                                                            Principal principal) {
        User user = userRepository.findByEmail(principal.getName()).orElseThrow();
        Booking booking = bookingRepository.findById(bookingId).orElseThrow();
        if (!booking.getUser().getId().equals(user.getId())) {
            return ResponseEntity.status(403).build();
        }

        if (dto.getMinutes() != 60) {
            return ResponseEntity.badRequest().build();
        }

        if (!hasFreeContinuation(booking)) {
            return ResponseEntity.status(409).build();
        }

        BookingExtension extension = BookingExtension.builder()
                .booking(booking)
                .requestedBy(user)
                .minutes(dto.getMinutes())
                .build();
        extensionRepository.save(extension);
        recordTransaction(booking, user, BookingTransaction.TransactionType.EXTENSION_REQUESTED,
                "Extension requested +" + dto.getMinutes() + "m");
        return ResponseEntity.ok(toExtensionView(extension));
    }

    @PreAuthorize("hasAnyRole('MANAGER','ADMIN')")
    @GetMapping("/turf/{turfId}")
    public ResponseEntity<List<BookingDtos.BookingSummary>> bookingsForTurf(@PathVariable Long turfId,
                                                                            Principal principal) {
        User requester = userRepository.findByEmail(principal.getName()).orElseThrow();
        Turf turf = turfRepository.findById(turfId).orElseThrow();
        if (!canManage(requester, turf)) {
            return ResponseEntity.status(403).build();
        }
        List<BookingDtos.BookingSummary> summaries = bookingRepository.findByTurfId(turfId).stream()
                .map(this::toSummary)
                .toList();
        return ResponseEntity.ok(summaries);
    }

    @PreAuthorize("hasAnyRole('MANAGER','ADMIN')")
    @GetMapping("/transactions/{turfId}")
    public ResponseEntity<List<BookingDtos.TransactionView>> transactionsForTurf(@PathVariable Long turfId,
                                                                                 Principal principal) {
        User requester = userRepository.findByEmail(principal.getName()).orElseThrow();
        Turf turf = turfRepository.findById(turfId).orElseThrow();
        if (!canManage(requester, turf)) {
            return ResponseEntity.status(403).build();
        }
        List<BookingDtos.TransactionView> list = transactionRepository
                .findByTurfIdOrderByCreatedAtDesc(turfId)
                .stream()
                .map(this::toTransactionView)
                .toList();
        return ResponseEntity.ok(list);
    }

    private boolean canManage(User user, Turf turf) {
        if (user.getRole() == User.UserRole.ADMIN) {
            return true;
        }
        return turf.getManagers().stream().anyMatch(manager -> manager.getId().equals(user.getId()));
    }

    private BookingDtos.BookingSummary toSummary(Booking booking) {
        BookingDtos.BookingSummary summary = new BookingDtos.BookingSummary();
        summary.setId(booking.getId());
        Slot primary = primarySlot(booking);
        summary.setSport(primary != null ? primary.getSport() : null);
        summary.setAmenity(primary != null ? primary.getAmenity() : null);
        summary.setStartAt(bookingStart(booking));
        summary.setEndAt(bookingEnd(booking));
        summary.setUser(toBookingUser(booking.getUser()));
        return summary;
    }

    private BookingDtos.MyBookingView toView(Booking booking, String role) {
        BookingDtos.MyBookingView view = new BookingDtos.MyBookingView();
        view.setId(booking.getId());
        view.setStatus(booking.getStatus());
        view.setPaymentStatus(booking.getPaymentStatus());
        view.setRefundable(booking.isRefundable());
        view.setPriceCents(booking.getPriceCents());
        view.setSlot(primarySlot(booking));
        view.setTurf(booking.getTurf());
        view.setRole(role);
        view.setStartAt(bookingStart(booking));
        view.setEndAt(bookingEnd(booking));
        view.setSlotCount(bookingSlots(booking).size());
        view.setSlotIds(bookingSlotIds(booking));
        view.setCanExtend(hasFreeContinuation(booking));
        view.setUser(toBookingUser(booking.getUser()));
        return view;
    }

    private BookingDtos.InviteView toInviteView(BookingInvite invite) {
        BookingDtos.InviteView view = new BookingDtos.InviteView();
        view.setId(invite.getId());
        view.setBookingId(invite.getBooking().getId());
        view.setContact(invite.getContact());
        view.setContactType(invite.getContactType());
        view.setStatus(invite.getStatus());
        view.setCreatedAt(invite.getCreatedAt());
        return view;
    }

    private BookingDtos.ExtensionView toExtensionView(BookingExtension extension) {
        BookingDtos.ExtensionView view = new BookingDtos.ExtensionView();
        view.setId(extension.getId());
        view.setBookingId(extension.getBooking().getId());
        view.setTurfId(extension.getBooking().getTurf().getId());
        view.setTurfName(extension.getBooking().getTurf().getName());
        view.setMinutes(extension.getMinutes());
        view.setStatus(extension.getStatus().name());
        view.setCreatedAt(extension.getCreatedAt());
        view.setRequestedBy(toBookingUser(extension.getRequestedBy()));
        view.setStartAt(bookingStart(extension.getBooking()));
        view.setEndAt(bookingEnd(extension.getBooking()));
        return view;
    }

    private BookingDtos.TransactionView toTransactionView(BookingTransaction transaction) {
        BookingDtos.TransactionView view = new BookingDtos.TransactionView();
        view.setId(transaction.getId());
        view.setBookingId(transaction.getBooking().getId());
        view.setType(transaction.getType().name());
        view.setMessage(transaction.getMessage());
        view.setCreatedAt(transaction.getCreatedAt());
        view.setActor(toBookingUser(transaction.getActor()));
        return view;
    }

    private BookingDtos.BookingUser toBookingUser(User user) {
        BookingDtos.BookingUser dto = new BookingDtos.BookingUser();
        dto.setId(user.getId());
        dto.setFullName(user.getFullName());
        dto.setEmail(user.getEmail());
        dto.setPhone(user.getPhone());
        return dto;
    }

    private BookingInvite.InviteType resolveType(String contact, BookingInvite.InviteType type) {
        if (type != null) {
            return type;
        }
        return contact.contains("@") ? BookingInvite.InviteType.EMAIL : BookingInvite.InviteType.PHONE;
    }

    private User matchUser(String contact, BookingInvite.InviteType type) {
        if (type == BookingInvite.InviteType.PHONE) {
            String normalized = normalizeDigits(contact);
            if (normalized.isBlank()) {
                return null;
            }
            return userRepository.findByPhone(normalized)
                    .or(() -> userRepository.findByPhone(contact))
                    .orElse(null);
        }
        return userRepository.findByEmailIgnoreCase(contact).orElse(null);
    }

    private boolean matchesUser(BookingInvite invite, User user) {
        if (invite.getInvitedUser() != null) {
            return invite.getInvitedUser().getId().equals(user.getId());
        }
        if (invite.getContactType() == BookingInvite.InviteType.PHONE && user.getPhone() != null) {
            return normalizeDigits(user.getPhone()).equals(invite.getContact());
        }
        if (invite.getContactType() == BookingInvite.InviteType.EMAIL && user.getEmail() != null) {
            return user.getEmail().equalsIgnoreCase(invite.getContact());
        }
        return false;
    }

    private String canonicalContact(User user, BookingInvite.InviteType type) {
        if (user == null) {
            return null;
        }
        if (type == BookingInvite.InviteType.PHONE) {
            String digits = normalizeDigits(user.getPhone());
            return digits.isBlank() ? null : digits;
        }
        return user.getEmail() != null ? user.getEmail().toLowerCase(Locale.ROOT) : null;
    }

    private boolean isSelfContact(User inviter, String rawContact, BookingInvite.InviteType type) {
        if (inviter == null || rawContact == null) {
            return false;
        }
        if (type == BookingInvite.InviteType.EMAIL && inviter.getEmail() != null) {
            return inviter.getEmail().equalsIgnoreCase(rawContact);
        }
        if (type == BookingInvite.InviteType.PHONE && inviter.getPhone() != null) {
            String normalized = normalizeDigits(rawContact);
            return !normalized.isBlank() && normalized.equals(normalizeDigits(inviter.getPhone()));
        }
        return false;
    }

    private String normalizeDigits(String value) {
        if (value == null) {
            return "";
        }
        return value.replaceAll("[^0-9+]", "");
    }

    private List<Slot> bookingSlots(Booking booking) {
        List<Slot> slots = booking.getSlots();
        if (slots == null || slots.isEmpty()) {
            return booking.getSlot() != null ? List.of(booking.getSlot()) : List.of();
        }
        return slots;
    }

    private Slot primarySlot(Booking booking) {
        List<Slot> slots = bookingSlots(booking);
        if (slots.isEmpty()) {
            return booking.getSlot();
        }
        return slots.stream().min(Comparator.comparing(Slot::getStartAt)).orElse(booking.getSlot());
    }

    private LocalDateTime bookingStart(Booking booking) {
        return bookingSlots(booking).stream()
                .map(Slot::getStartAt)
                .min(LocalDateTime::compareTo)
                .orElseGet(() -> booking.getSlot() != null ? booking.getSlot().getStartAt() : null);
    }

    private LocalDateTime bookingEnd(Booking booking) {
        return bookingSlots(booking).stream()
                .map(Slot::getEndAt)
                .max(LocalDateTime::compareTo)
                .orElseGet(() -> booking.getSlot() != null ? booking.getSlot().getEndAt() : null);
    }

    private List<Long> bookingSlotIds(Booking booking) {
        List<Long> ids = bookingSlots(booking).stream()
                .map(Slot::getId)
                .filter(java.util.Objects::nonNull)
                .toList();
        if (!ids.isEmpty()) {
            return ids;
        }
        return booking.getSlot() != null && booking.getSlot().getId() != null
                ? List.of(booking.getSlot().getId())
                : List.of();
    }

    private boolean hasFreeContinuation(Booking booking) {
        return nextFreeSlot(booking) != null;
    }

    private Slot nextFreeSlot(Booking booking) {
        Slot reference = primarySlot(booking);
        LocalDateTime end = bookingEnd(booking);
        if (reference == null || end == null) {
            return null;
        }
        return slotRepository.findByTurfAndStartAt(booking.getTurf(), end).stream()
                .filter(slot -> equalsIgnoreCase(slot.getAmenity(), reference.getAmenity()))
                .filter(slot -> equalsIgnoreCase(slot.getSport(), reference.getSport()))
                .filter(slot -> slot.getStatus() == Slot.SlotStatus.FREE)
                .findFirst()
                .orElse(null);
    }

    private String describeWindow(Booking booking) {
        LocalDateTime start = bookingStart(booking);
        LocalDateTime end = bookingEnd(booking);
        if (start == null || end == null) {
            Slot slot = booking.getSlot();
            return slot != null ? slot.getStartAt() + " - " + slot.getEndAt() : "booking window";
        }
        return start + " to " + end;
    }

    private boolean equalsIgnoreCase(String a, String b) {
        if (a == null && b == null) {
            return true;
        }
        if (a == null || b == null) {
            return false;
        }
        return a.equalsIgnoreCase(b);
    }

    private void recordTransaction(Booking booking,
                                   User actor,
                                   BookingTransaction.TransactionType type,
                                   String message) {
        BookingTransaction tx = BookingTransaction.builder()
                .booking(booking)
                .turf(booking.getTurf())
                .actor(actor)
                .type(type)
                .message(message)
                .build();
        transactionRepository.save(tx);
    }
}
