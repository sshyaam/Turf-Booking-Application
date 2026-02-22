package com.example.turfBooking.repo;

import com.example.turfBooking.model.Review;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface ReviewRepository extends JpaRepository<Review, Long> {

    List<Review> findByTurfId(Long turfId);

    Optional<Review> findByTurfIdAndUserId(Long turfId, Long userId);
}
