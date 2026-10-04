package com.club.model;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

import java.time.Instant;

@Entity @Table(name = "users") @Getter @Setter
public class AppUser {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) private Long id;
    @Column(unique = true, nullable = false) private String username;
    @Column(unique = true, nullable = false) private String email;
    private String mobilePhone;
    private String name;
    private String surname;
    @JsonIgnore private String passwordHash;
    @Enumerated(EnumType.STRING) private Role role = Role.USER;
    /**
     * New sign-ups start PENDING; a SuperAdmin approves or rejects them before they can log in.
     * Stored as plain varchar (not a native SQL ENUM) so adding a new status later - like
     * SUSPENDED - never again requires widening the column by hand.
     */
    @Enumerated(EnumType.STRING) @Column(columnDefinition = "varchar(20)") private AccountStatus status = AccountStatus.PENDING;
    /** Set by the SuperAdmin when status is REJECTED, and shown to the member. */
    @Column(columnDefinition = "text") private String rejectionReason;

    /**
     * True while the member has asked (from their account page) to pause or resume their
     * membership and a SuperAdmin hasn't actioned it yet. Which one they're asking for follows
     * from {@code status}: APPROVED + this flag means "please suspend me"; SUSPENDED + this flag
     * means "please reactivate me". Cleared whenever an admin confirms or declines the request,
     * or acts on the account directly.
     */
    private Boolean suspensionRequested = Boolean.FALSE;

    /**
     * The first month ("2026-03") this member is expected to pay from. Set automatically to the
     * approval month when a SuperAdmin approves the account, but editable afterwards (e.g. to
     * backdate a member who actually joined earlier). Null means no restriction - treated as
     * eligible for every month - which keeps members approved before this field existed working
     * exactly as before.
     */
    private String memberSince;

    /** Consent to store/process personal data - required at sign-up. */
    private Boolean consentPrivacy = Boolean.FALSE;
    /** Consent to marketing emails, including via third-party marketing services - required at sign-up. */
    private Boolean consentMarketing = Boolean.FALSE;
    /** When the two consents above were given (sign-up time). */
    private Instant consentAt;
}
