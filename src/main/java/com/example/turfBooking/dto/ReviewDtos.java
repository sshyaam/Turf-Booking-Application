package com.example.turfBooking.dto;

import com.example.turfBooking.model.Review;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.time.Instant;
import java.util.List;

@Data
public class ReviewDtos {

    @Data
    public static class CreateReviewRequest {
        private Long bookingId;
        @NotNull
        private Long turfId;
        @NotNull
        private Long userId;
        @Min(1)
        @Max(5)
        private int rating;
        @NotBlank
        private String body;
        private List<String> images;
    }

    @Data
    public static class UpdateReviewRequest {
        @Min(1)
        @Max(5)
        private int rating;
        @NotBlank
        private String body;
        private List<String> images;
    }

    @Data
    public static class ReviewResponse {
        private Long id;
        private Long turfId;
        private Long userId;
        private Long bookingId;
        private int rating;
        private String body;
        private Review.ReviewStatus status;
        private Instant createdAt;
        private List<String> images;
        private ReviewUserSummary user;
    }

    @Data
    public static class ReviewUserSummary {
        private Long id;
        private String fullName;
        private String email;
        private String phone;
    }
}
