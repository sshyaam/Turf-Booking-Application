package com.example.turfBooking.model;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import lombok.*;

import java.time.Instant;

@Entity
@Table(name = "turf_images")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@EqualsAndHashCode(exclude = "turf")
@ToString(exclude = "turf")
public class TurfImage {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "turf_id")
    @JsonIgnore
    private Turf turf;

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

    public String toDataUrl() {
        if (data == null || data.length == 0) {
            return null;
        }
        String mime = (mimeType == null || mimeType.isBlank()) ? "application/octet-stream" : mimeType;
        return "data:" + mime + ";base64," + java.util.Base64.getEncoder().encodeToString(data);
    }
}
