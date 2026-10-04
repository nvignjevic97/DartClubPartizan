package com.club.model;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;
import java.time.Instant;

/** One subscription proof per user per month ("2026-09"). */
@Entity @Getter @Setter
@Table(uniqueConstraints = @UniqueConstraint(columnNames = {"user_id", "month"}))
public class Payment {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) private Long id;
    @ManyToOne(optional = false) @JoinColumn(name = "user_id") private AppUser user;
    @Column(nullable = false) private String month;
    private String fileName;
    private String contentType;
    @Lob @JsonIgnore
    @Column(columnDefinition = "LONGBLOB")
    private byte[] data;
    @Enumerated(EnumType.STRING) private PaymentStatus status = PaymentStatus.PENDING;
    private Instant uploadedAt = Instant.now();
}
