package com.example.turfBooking.repo;

import com.example.turfBooking.model.SupportTicket;
import com.example.turfBooking.model.User;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface SupportTicketRepository extends JpaRepository<SupportTicket, Long> {

    List<SupportTicket> findByUser(User user);
}

