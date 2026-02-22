package com.example.turfBooking.repo;

import com.example.turfBooking.model.Turf;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface TurfRepository extends JpaRepository<Turf, Long> {

    @Query("""
            SELECT t FROM Turf t
            WHERE (:city IS NULL OR LOWER(t.city) LIKE LOWER(CONCAT('%', :city, '%')))
              AND (:pincode IS NULL OR t.pincode = :pincode)
              AND (:sport IS NULL OR EXISTS (SELECT s FROM t.sports s WHERE LOWER(s) = LOWER(:sport)))
              AND (:amenity IS NULL OR EXISTS (SELECT a FROM t.amenities a WHERE LOWER(a) = LOWER(:amenity)))
            """)
    Page<Turf> search(
            @Param("city") String city,
            @Param("pincode") String pincode,
            @Param("sport") String sport,
            @Param("amenity") String amenity,
            Pageable pageable
    );

    List<Turf> findDistinctByManagers_Id(Long managerId);
}
