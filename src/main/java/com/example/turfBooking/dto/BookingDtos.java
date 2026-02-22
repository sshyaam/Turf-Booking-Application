package com.example.turfBooking.dto;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.time.LocalDateTime;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;

import com.example.turfBooking.model.Booking;
import com.example.turfBooking.model.BookingExtension;
import com.example.turfBooking.model.BookingInvite;

@Data
public class BookingDtos {

    @Data
    public static class CreateSlotRequest {
        @NotNull
        private Long turfId;
        private String sport;
        // Amenity on this turf, e.g. "Football Ground", "Swimming Pool"
        private String amenity;
        @NotNull
        private LocalDateTime startAt;
        @NotNull
        private LocalDateTime endAt;
        @NotNull
        private Long price;
    }

    @Data
    public static class BookSlotRequest {
        private Long slotId;
        private List<Long> slotIds = new ArrayList<>();
        private boolean refundable = true;

        public List<Long> allSlotIds() {
            List<Long> combined = new ArrayList<>(slotIds == null ? List.of() : slotIds);
            if (slotId != null && !combined.contains(slotId)) {
                combined.add(slotId);
            }
            return combined;
        }
    }

    @Data
    public static class CancelBookingRequest {
        @NotNull
        private Long bookingId;
    }

    @Data
    public static class BookingSummary {
        private Long id;
        private String sport;
        private String amenity;
        private LocalDateTime startAt;
        private LocalDateTime endAt;
        private BookingUser user;
    }

    @Data
    public static class BookingUser {
        private Long id;
        private String fullName;
        private String email;
        private String phone;
    }

    @Data
    public static class InviteRequest {
        @NotBlank
        private String contact;
        private BookingInvite.InviteType type;
    }

    @Data
    public static class InviteView {
        private Long id;
        private Long bookingId;
        private String contact;
        private BookingInvite.InviteType contactType;
        private BookingInvite.InviteStatus status;
        private Instant createdAt;
    }

    @Data
    public static class ExtensionRequestDto {
        @Min(60)
        @Max(60)
        private int minutes = 60;
    }

    @Data
    public static class ExtensionDecisionRequest {
        @NotNull
        private BookingExtension.ExtensionStatus decision;
    }

    @Data
    public static class ExtensionView {
        private Long id;
        private Long bookingId;
        private Long turfId;
        private String turfName;
        private java.time.LocalDateTime startAt;
        private java.time.LocalDateTime endAt;
        private int minutes;
        private String status;
        private Instant createdAt;
        private BookingUser requestedBy;
    }

    @Data
    public static class MyBookingView {
        private Long id;
        private Booking.BookingStatus status;
        private Booking.PaymentStatus paymentStatus;
        private boolean refundable;
        private Long priceCents;
        private BookingUser user;
        private Object turf;
        private Object slot;
        private String role;
        private java.time.LocalDateTime startAt;
        private java.time.LocalDateTime endAt;
        private int slotCount;
        private java.util.List<Long> slotIds;
        private boolean canExtend = true;
    }

    @Data
    public static class TransactionView {
        private Long id;
        private Long bookingId;
        private String type;
        private String message;
        private Instant createdAt;
        private BookingUser actor;
    }
}
