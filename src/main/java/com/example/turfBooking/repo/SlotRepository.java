package com.example.turfBooking.repo;

import com.example.turfBooking.model.Booking;
import com.example.turfBooking.model.Slot;
import com.example.turfBooking.model.Turf;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;
import java.util.List;

public interface SlotRepository extends JpaRepository<Slot, Long> {

    List<Slot> findByTurfId(Long turfId);

    List<Slot> findByBooking(Booking booking);

    List<Slot> findByTurfAndStartAt(Turf turf, LocalDateTime startAt);

    @Query("select s from Slot s where s.turf = :turf and s.startAt < :end and s.endAt > :start")
    List<Slot> findOverlappingSlots(@Param("turf") Turf turf,
                                    @Param("start") LocalDateTime start,
                                    @Param("end") LocalDateTime end);
}
