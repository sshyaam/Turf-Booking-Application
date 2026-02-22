package com.example.turfBooking.model;

import com.fasterxml.jackson.annotation.JsonIgnore;
import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.Fetch;
import org.hibernate.annotations.FetchMode;

import java.time.Instant;
import java.time.LocalTime;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Entity
@Table(name = "turfs")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Turf {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 150)
    private String name;

    private String city;
    private String state;
    private String pincode;

    // Opening and closing time for the turf (for hourly calendar)
    private LocalTime openTime;
    private LocalTime closeTime;

    @Column(nullable = false)
    @Builder.Default
    private Long hourlyPrice = 0L;

    @ElementCollection
    @CollectionTable(name = "turf_custom_prices", joinColumns = @JoinColumn(name = "turf_id"))
    @MapKeyColumn(name = "day_of_week")
    @Column(name = "price")
    @Builder.Default
    private Map<String, Long> customPricing = new HashMap<>();

    @ElementCollection
    @CollectionTable(name = "turf_sports", joinColumns = @JoinColumn(name = "turf_id"))
    @Column(name = "sport")
    @Builder.Default
    private List<String> sports = new ArrayList<>();

    @ElementCollection
    @CollectionTable(name = "turf_amenities", joinColumns = @JoinColumn(name = "turf_id"))
    @Column(name = "amenity")
    @Builder.Default
    private List<String> amenities = new ArrayList<>();

    @ManyToMany
    @JoinTable(
            name = "turf_managers",
            joinColumns = @JoinColumn(name = "turf_id"),
            inverseJoinColumns = @JoinColumn(name = "user_id")
    )
    @Builder.Default
    private List<User> managers = new ArrayList<>();

    @OneToMany(mappedBy = "turf", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.EAGER)
    @Fetch(FetchMode.SUBSELECT)
    @Builder.Default
    @JsonIgnore
    private List<TurfImage> photos = new ArrayList<>();

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    @Builder.Default
    private TurfStatus status = TurfStatus.PENDING;

    @Column(nullable = false, updatable = false)
    @Builder.Default
    private Instant createdAt = Instant.now();

    @Column(nullable = false)
    @Builder.Default
    private Instant updatedAt = Instant.now();

    @PreUpdate
    public void onUpdate() {
        this.updatedAt = Instant.now();
    }

    @Transient
    @JsonProperty("imageUrls")
    public List<String> getImageUrls() {
        if (photos == null || photos.isEmpty()) {
            return List.of();
        }
        return photos.stream()
                .map(TurfImage::toDataUrl)
                .filter(url -> url != null && !url.isBlank())
                .collect(Collectors.toList());
    }

    public enum TurfStatus {
        PENDING, APPROVED, SUSPENDED
    }
}
