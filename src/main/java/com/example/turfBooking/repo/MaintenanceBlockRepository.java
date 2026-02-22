package com.example.turfBooking.repo;

import com.example.turfBooking.model.MaintenanceBlock;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface MaintenanceBlockRepository extends JpaRepository<MaintenanceBlock, Long> {
    List<MaintenanceBlock> findByTurfId(Long turfId);
}
