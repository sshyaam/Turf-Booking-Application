package com.example.turfBooking.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

import java.util.List;
import java.util.Map;

@Data
public class TurfDtos {

    @Data
    public static class TurfCreateRequest {
        @NotBlank
        private String name;
        private String city;
        private String state;
        private String pincode;
        private List<String> sports;
        private List<String> amenities;
        // Opening and closing time for hourly slots (e.g. 06:00, 22:00)
        private java.time.LocalTime openTime;
        private java.time.LocalTime closeTime;
        private Long hourlyPrice;
        private Map<String, Long> customPricing;
        // Manager contacts (email or phone) to add to the turf
        private List<ManagerContact> managers;
    }

    @Data
    public static class ManagerContact {
        private String contact; // email or phone
        private String type; // 'email' or 'phone'
    }

    @Data
    public static class TurfSearchRequest {
        private String city;
        private String pincode;
        private String sport;
        private String amenity;
        private int page = 0;
        private int size = 10;
    }
}
