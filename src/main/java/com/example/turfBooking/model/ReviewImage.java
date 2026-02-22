package com.example.turfBooking.model;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import lombok.*;

import java.time.Instant;

@Entity
@Table(name = "review_images")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@EqualsAndHashCode(exclude = "review")
@ToString(exclude = "review")
public class ReviewImage {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "review_id")
    @JsonIgnore
    private Review review;

    @Lob
    @Column(name = "image_data", nullable = false, columnDefinition = "BLOB")
    private byte[] data;

    @Column(name = "mime_type", length = 100, nullable = false)
    @Builder.Default
    private String mimeType = "application/octet-stream";

    @Column(name = "file_name", length = 120)
    private String fileName;

    @Column(name = "created_at", nullable = false, updatable = false)
    @Builder.Default
    private Instant createdAt = Instant.now();
}
