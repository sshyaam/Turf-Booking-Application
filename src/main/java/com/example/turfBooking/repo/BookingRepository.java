package com.example.turfBooking.repo;

import com.example.turfBooking.model.Booking;
import com.example.turfBooking.model.User;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.Instant;
import java.util.List;

public interface BookingRepository extends JpaRepository<Booking, Long> {

    List<Booking> findByUser(User user);

    List<Booking> findByTurfIdAndCreatedAtBetween(Long turfId, Instant from, Instant to);

    List<Booking> findByTurfId(Long turfId);
}
