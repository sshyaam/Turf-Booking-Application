package com.example.turfBooking.model;

import com.fasterxml.jackson.annotation.JsonIgnore;
import com.fasterxml.jackson.annotation.JsonInclude;
import com.fasterxml.jackson.annotation.JsonInclude.Include;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Builder.Default;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "bookings")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Booking {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(optional = false)
    @JoinColumn(name = "user_id")
    private User user;

    @ManyToOne(optional = false)
    @JoinColumn(name = "turf_id")
    private Turf turf;

    @ManyToOne(optional = false)
    @JoinColumn(name = "slot_id")
    private Slot slot;

    @OneToMany(mappedBy = "booking", fetch = FetchType.LAZY)
    @JsonIgnore
    @Default
    private List<Slot> slots = new ArrayList<>();

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    @Builder.Default
    private BookingStatus status = BookingStatus.HOLD;

    @Column(nullable = false)
    private Long priceCents;

    @Column(length = 3, nullable = false)
    @Builder.Default
    private String currency = "INR";

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    @Builder.Default
    private PaymentStatus paymentStatus = PaymentStatus.NONE;

    private LocalDateTime holdExpiresAt;

    @Builder.Default
    private boolean refundable = true;

    private Long refundedAmountCents;

    @Column(nullable = false, updatable = false)
    @Builder.Default
    private Instant createdAt = Instant.now();

    @Column(nullable = false)
    @Builder.Default
    private Instant updatedAt = Instant.now();

    @Transient
    @JsonInclude(Include.NON_NULL)
    private String role;

    @PreUpdate
    public void onUpdate() {
        this.updatedAt = Instant.now();
    }

    public enum BookingStatus {
        HOLD, CONFIRMED, CANCELLED, REFUNDED, FAILED
    }

    public enum PaymentStatus {
        NONE, INITIATED, PAID, FAILED, REFUNDED, PARTIAL_REFUND
    }
}
