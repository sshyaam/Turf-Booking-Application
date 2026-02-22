package com.example.turfBooking.repo;

import com.example.turfBooking.model.Booking;
import com.example.turfBooking.model.BookingExtension;
import com.example.turfBooking.model.User;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface BookingExtensionRepository extends JpaRepository<BookingExtension, Long> {

    List<BookingExtension> findByRequestedBy(User user);

    List<BookingExtension> findByBooking(Booking booking);

    List<BookingExtension> findByBooking_Turf_IdIn(List<Long> turfIds);
}
