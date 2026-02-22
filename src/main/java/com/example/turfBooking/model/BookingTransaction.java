package com.example.turfBooking.model;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;

@Entity
@Table(name = "booking_transactions")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class BookingTransaction {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(optional = false)
    @JoinColumn(name = "booking_id")
    private Booking booking;

    @ManyToOne(optional = false)
    @JoinColumn(name = "turf_id")
    private Turf turf;

    @ManyToOne(optional = false)
    @JoinColumn(name = "actor_id")
    private User actor;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 32)
    private TransactionType type;

    @Column(length = 400)
    private String message;

    @Column(nullable = false, updatable = false)
    @Builder.Default
    private Instant createdAt = Instant.now();

    public enum TransactionType {
        BOOKED,
        CANCELLED,
        INVITE_SENT,
        INVITE_ACCEPTED,
        EXTENSION_REQUESTED,
        EXTENSION_APPROVED,
        EXTENSION_DECLINED
    }
}
