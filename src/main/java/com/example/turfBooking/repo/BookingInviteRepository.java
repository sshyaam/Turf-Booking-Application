package com.example.turfBooking.repo;

import com.example.turfBooking.model.Booking;
import com.example.turfBooking.model.BookingInvite;
import com.example.turfBooking.model.User;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface BookingInviteRepository extends JpaRepository<BookingInvite, Long> {

    boolean existsByBookingAndContactIgnoreCase(Booking booking, String contact);

    List<BookingInvite> findByInvitedUserAndStatus(User user, BookingInvite.InviteStatus status);

    List<BookingInvite> findByContactIgnoreCaseAndStatus(String contact, BookingInvite.InviteStatus status);

    List<BookingInvite> findByBooking(Booking booking);

    Optional<BookingInvite> findByIdAndStatus(Long id, BookingInvite.InviteStatus status);
}
