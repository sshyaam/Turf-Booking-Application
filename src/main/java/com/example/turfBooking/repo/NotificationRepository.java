package com.example.turfBooking.repo;

import com.example.turfBooking.model.Notification;
import com.example.turfBooking.model.User;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface NotificationRepository extends JpaRepository<Notification, Long> {

    List<Notification> findByUserOrderByCreatedAtDesc(User user);
}

