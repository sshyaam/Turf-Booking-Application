package com.example.turfBooking.controller;

import com.example.turfBooking.dto.ReviewDtos;
import com.example.turfBooking.model.Booking;
import com.example.turfBooking.model.Review;
import com.example.turfBooking.model.ReviewImage;
import com.example.turfBooking.model.Turf;
import com.example.turfBooking.model.User;
import com.example.turfBooking.repo.BookingRepository;
import com.example.turfBooking.repo.ReviewRepository;
import com.example.turfBooking.repo.TurfRepository;
import com.example.turfBooking.repo.UserRepository;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.security.Principal;
import java.util.ArrayList;
import java.util.Base64;
import java.util.List;
import java.util.Objects;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@RestController
@RequestMapping("/api/reviews")
@CrossOrigin
public class ReviewController {

    private final ReviewRepository reviewRepository;
    private final UserRepository userRepository;
    private final TurfRepository turfRepository;
    private final BookingRepository bookingRepository;

    public ReviewController(ReviewRepository reviewRepository,
                            UserRepository userRepository,
                            TurfRepository turfRepository,
                            BookingRepository bookingRepository) {
        this.reviewRepository = reviewRepository;
        this.userRepository = userRepository;
        this.turfRepository = turfRepository;
        this.bookingRepository = bookingRepository;
    }

    @PostMapping
    public ResponseEntity<ReviewDtos.ReviewResponse> create(@Valid @RequestBody ReviewDtos.CreateReviewRequest request,
                                                            Principal principal) {
        User user = userRepository.findById(request.getUserId()).orElseThrow();
        if (principal != null && !principal.getName().equalsIgnoreCase(user.getEmail())) {
            return ResponseEntity.status(403).build();
        }
        Turf turf = turfRepository.findById(request.getTurfId()).orElseThrow();
        Booking booking = null;
        if (request.getBookingId() != null) {
            booking = bookingRepository.findById(request.getBookingId()).orElse(null);
        }
        Review review = reviewRepository.findByTurfIdAndUserId(turf.getId(), user.getId())
                .orElse(Review.builder()
                        .turf(turf)
                        .user(user)
                        .status(Review.ReviewStatus.PUBLISHED)
                        .build());
        review.setBooking(booking);
        review.setRating(request.getRating());
        review.setBody(request.getBody());
        review.setStatus(Review.ReviewStatus.PUBLISHED);
        applyImages(review, request.getImages());
        Review saved = reviewRepository.save(review);
        return ResponseEntity.ok(toResponse(saved));
    }

    @GetMapping("/turf/{turfId}")
    public ResponseEntity<List<ReviewDtos.ReviewResponse>> byTurf(@PathVariable Long turfId) {
        return ResponseEntity.ok(
                reviewRepository.findByTurfId(turfId).stream().map(this::toResponse).toList()
        );
    }

    @PutMapping("/{id}")
    public ResponseEntity<ReviewDtos.ReviewResponse> update(@PathVariable Long id,
                                                            @Valid @RequestBody ReviewDtos.UpdateReviewRequest request,
                                                            Principal principal) {
        Review review = reviewRepository.findById(id).orElseThrow();
        if (principal == null || !principal.getName().equalsIgnoreCase(review.getUser().getEmail())) {
            return ResponseEntity.status(403).build();
        }
        review.setRating(request.getRating());
        review.setBody(request.getBody());
        applyImages(review, request.getImages());
        Review saved = reviewRepository.save(review);
        return ResponseEntity.ok(toResponse(saved));
    }

    private void applyImages(Review review, List<String> payload) {
        if (payload == null) {
            return;
        }
        List<ReviewImage> target = review.getImages();
        if (target == null) {
            target = new ArrayList<>();
            review.setImages(target);
        }
        target.clear();
        for (String raw : payload) {
            ReviewImage image = decodeImage(raw);
            if (image == null) {
                continue;
            }
            image.setReview(review);
            target.add(image);
        }
    }

    private ReviewImage decodeImage(String dataUrl) {
        if (dataUrl == null || dataUrl.isBlank()) {
            return null;
        }
        Matcher matcher = DATA_URL_PATTERN.matcher(dataUrl);
        if (!matcher.matches()) {
            return null;
        }
        try {
            String mime = matcher.group(1);
            String base64 = matcher.group(2);
            byte[] bytes = Base64.getDecoder().decode(base64);
            if (bytes.length == 0) {
                return null;
            }
            return ReviewImage.builder()
                    .mimeType((mime == null || mime.isBlank()) ? "application/octet-stream" : mime)
                    .data(bytes)
                    .build();
        } catch (IllegalArgumentException e) {
            return null;
        }
    }

    private ReviewDtos.ReviewResponse toResponse(Review review) {
        ReviewDtos.ReviewResponse dto = new ReviewDtos.ReviewResponse();
        dto.setId(review.getId());
        dto.setTurfId(review.getTurf().getId());
        dto.setUserId(review.getUser().getId());
        dto.setBookingId(review.getBooking() != null ? review.getBooking().getId() : null);
        dto.setRating(review.getRating());
        dto.setBody(review.getBody());
        dto.setStatus(review.getStatus());
        dto.setCreatedAt(review.getCreatedAt());
        dto.setImages(review.getImages() == null
                ? List.of()
                : review.getImages().stream().map(this::toDataUrl).filter(Objects::nonNull).toList());
        dto.setUser(toUserSummary(review.getUser()));
        return dto;
    }

    private ReviewDtos.ReviewUserSummary toUserSummary(User user) {
        if (user == null) {
            return null;
        }
        ReviewDtos.ReviewUserSummary summary = new ReviewDtos.ReviewUserSummary();
        summary.setId(user.getId());
        summary.setFullName(user.getFullName());
        summary.setEmail(user.getEmail());
        summary.setPhone(user.getPhone());
        return summary;
    }

    private String toDataUrl(ReviewImage image) {
        if (image.getData() == null || image.getData().length == 0) {
            return null;
        }
        String mime = (image.getMimeType() == null || image.getMimeType().isBlank())
                ? "application/octet-stream"
                : image.getMimeType();
        return "data:" + mime + ";base64," + Base64.getEncoder().encodeToString(image.getData());
    }

    private static final Pattern DATA_URL_PATTERN = Pattern.compile("^data:(.+);base64,(.+)$");
}
