package com.example.turfBooking.config;

import com.example.turfBooking.model.*;
import com.example.turfBooking.repo.*;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;

@Configuration
public class StartupConfig {

    @Bean
    CommandLineRunner seedData(UserRepository userRepository,
                               TurfRepository turfRepository,
                               SlotRepository slotRepository,
                               BookingRepository bookingRepository,
                               NotificationRepository notificationRepository,
                               PasswordEncoder passwordEncoder) {
        return args -> {
            userRepository.findByEmail("admin@admin.com").orElseGet(() ->
                    userRepository.save(User.builder()
                            .email("admin@admin.com")
                            .fullName("Default Admin")
                            .passwordHash(passwordEncoder.encode("admin123"))
                            .role(User.UserRole.ADMIN)
                            .build())
            );

            User manager = userRepository.findByEmail("manager@manager.com").orElseGet(() ->
                    userRepository.save(User.builder()
                            .email("manager@manager.com")
                            .fullName("Sample Manager")
                            .passwordHash(passwordEncoder.encode("manager123"))
                            .role(User.UserRole.MANAGER)
                            .build())
            );

            User player = userRepository.findByEmail("test@test.com").orElseGet(() ->
                    userRepository.save(User.builder()
                            .email("test@test.com")
                            .fullName("Sample Player")
                            .passwordHash(passwordEncoder.encode("test123"))
                            .role(User.UserRole.USER)
                            .build())
            );

            if (turfRepository.count() == 0) {
                Turf arena91 = Turf.builder()
                        .name("Arena 91 Futbol")
                        .city("Chennai")
                        .state("TN")
                        .pincode("600041")
                        .openTime(LocalTime.of(6, 0))
                        .closeTime(LocalTime.of(23, 0))
                        .sports(new ArrayList<>(List.of("Football", "Futsal")))
                        .amenities(new ArrayList<>(List.of("LED Lights", "Locker", "Cafe")))
                        .hourlyPrice(1800L)
                        .customPricing(Map.of("SATURDAY", 2200L, "SUNDAY", 2200L))
                        .status(Turf.TurfStatus.APPROVED)
                        .build();
                arena91.getManagers().add(manager);

                Turf skyline = Turf.builder()
                        .name("Skyline Badminton Pods")
                        .city("Hyderabad")
                        .state("TS")
                        .pincode("500082")
                        .openTime(LocalTime.of(5, 0))
                        .closeTime(LocalTime.of(22, 0))
                        .sports(new ArrayList<>(List.of("Badminton")))
                        .amenities(new ArrayList<>(List.of("Air Conditioning", "Pro Shop")))
                        .hourlyPrice(1200L)
                        .status(Turf.TurfStatus.APPROVED)
                        .build();
                skyline.getManagers().add(manager);

                turfRepository.saveAll(List.of(arena91, skyline));
            }

            List<Turf> turfs = turfRepository.findAll();

            if (slotRepository.count() == 0 && !turfs.isEmpty()) {
                LocalDateTime base = LocalDateTime.now().plusHours(2);
                List<Slot> slots = new ArrayList<>();
                slots.add(Slot.builder()
                        .turf(turfs.get(0))
                        .sport("Football")
                        .amenity("Pitch A")
                        .startAt(base)
                        .endAt(base.plusHours(2))
                        .price(2500L)
                        .status(Slot.SlotStatus.FREE)
                        .build());
                slots.add(Slot.builder()
                        .turf(turfs.get(0))
                        .sport("Football")
                        .amenity("Pitch B")
                        .startAt(base.plusHours(3))
                        .endAt(base.plusHours(5))
                        .price(2600L)
                        .status(Slot.SlotStatus.FREE)
                        .build());
                slots.add(Slot.builder()
                        .turf(turfs.get(turfs.size() > 1 ? 1 : 0))
                        .sport("Badminton")
                        .amenity("Court 1")
                        .startAt(base.plusHours(1))
                        .endAt(base.plusHours(2))
                        .price(1200L)
                        .status(Slot.SlotStatus.FREE)
                        .build());
                slotRepository.saveAll(slots);
            }

            List<Slot> slots = slotRepository.findAll();
            if (bookingRepository.count() == 0 && !slots.isEmpty()) {
                Slot bookedSlot = slots.get(0);
                bookedSlot.setStatus(Slot.SlotStatus.BOOKED);
                slotRepository.save(bookedSlot);

                Booking booking = Booking.builder()
                        .user(player)
                        .turf(bookedSlot.getTurf())
                        .slot(bookedSlot)
                        .status(Booking.BookingStatus.CONFIRMED)
                        .paymentStatus(Booking.PaymentStatus.PAID)
                        .priceCents(bookedSlot.getPrice())
                        .refundable(true)
                        .build();
                bookingRepository.save(booking);

                notificationRepository.save(Notification.builder()
                        .user(player)
                        .type(Notification.NotificationType.BOOKING)
                        .message("Booking #" + booking.getId() + " confirmed at " + bookedSlot.getTurf().getName())
                        .build());
            }
        };
    }
}
