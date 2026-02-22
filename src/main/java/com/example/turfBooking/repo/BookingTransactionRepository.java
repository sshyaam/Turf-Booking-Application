package com.example.turfBooking.repo;

import com.example.turfBooking.model.BookingTransaction;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface BookingTransactionRepository extends JpaRepository<BookingTransaction, Long> {

    List<BookingTransaction> findByTurfIdOrderByCreatedAtDesc(Long turfId);
}
