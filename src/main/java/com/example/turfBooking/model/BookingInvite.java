package com.example.turfBooking.model;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;

@Entity
@Table(name = "booking_invites",
        uniqueConstraints = @UniqueConstraint(name = "ux_booking_invite_contact", columnNames = {"booking_id", "contact"}))
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class BookingInvite {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(optional = false)
    @JoinColumn(name = "booking_id")
    private Booking booking;

    @ManyToOne(optional = false)
    @JoinColumn(name = "invited_by")
    private User invitedBy;

    @ManyToOne
    @JoinColumn(name = "invited_user")
    private User invitedUser;

    @Column(nullable = false, length = 120)
    private String contact;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 10)
    @Builder.Default
    private InviteType contactType = InviteType.EMAIL;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 12)
    @Builder.Default
    private InviteStatus status = InviteStatus.SENT;

    @Column(nullable = false, updatable = false)
    @Builder.Default
    private Instant createdAt = Instant.now();

    private Instant respondedAt;

    public enum InviteType {
        EMAIL, PHONE
    }

    public enum InviteStatus {
        SENT, ACCEPTED, DECLINED, CANCELLED
    }
}
