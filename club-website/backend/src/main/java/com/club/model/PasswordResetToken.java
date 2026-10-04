package com.club.model;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

import java.time.Instant;

/**
 * A one-time link sent to a member's email so they can set a new password without knowing the
 * old one. Created by POST /api/auth/forgot-password, consumed by POST /api/auth/reset-password.
 * Expires after an hour and is deleted once used (or once a newer token is requested), so at most
 * one valid token exists per user at a time.
 */
@Entity @Table(name = "password_reset_tokens") @Getter @Setter
public class PasswordResetToken {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) private Long id;
    @Column(unique = true, nullable = false) private String token;
    @Column(nullable = false) private Long userId;
    @Column(nullable = false) private Instant expiresAt;
}
