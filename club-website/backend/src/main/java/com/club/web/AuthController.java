package com.club.web;

import com.club.config.JwtService;
import com.club.mail.MailService;
import com.club.model.*;
import com.club.repo.service.PasswordResetTokenRepo;
import com.club.repo.service.UserRepo;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.time.Duration;
import java.time.Instant;
import java.util.UUID;
import java.util.regex.Pattern;

@RestController @RequestMapping("/api/auth")
public class AuthController {
    /** Optional leading +, then 7-15 digits - covers a local number or a full international one. */
    private static final Pattern PHONE = Pattern.compile("^\\+?[0-9]{7,15}$");

    public record RegisterReq(String username, String email, String password, String mobilePhone, String name, String surname,
                               Boolean consentPrivacy, Boolean consentMarketing) {}
    public record LoginReq(String identifier, String password) {}
    public record AuthRes(String token, String username, String email, String name, String surname, String role, String memberSince,
                           String status, boolean suspensionRequested) {}
    public record RegisterRes(String message) {}
    public record ForgotPasswordReq(String email) {}
    public record MessageRes(String message) {}
    public record ResetPasswordReq(String token, String newPassword) {}

    private final UserRepo users; private final PasswordEncoder enc; private final JwtService jwt; private final MailService mail;
    private final PasswordResetTokenRepo resetTokens;
    private final String frontendUrl;

    public AuthController(UserRepo users, PasswordEncoder enc, JwtService jwt, MailService mail, PasswordResetTokenRepo resetTokens,
                           @Value("${app.frontend-url:http://localhost:5173}") String frontendUrl) {
        this.users = users; this.enc = enc; this.jwt = jwt; this.mail = mail; this.resetTokens = resetTokens; this.frontendUrl = frontendUrl;
    }

    @PostMapping("/register")
    public RegisterRes register(@RequestBody RegisterReq r) {
        if (r.username() == null || r.username().trim().length() < 3)
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Username needs at least 3 characters");
        if (!r.username().matches("[A-Za-z0-9_.]+"))
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Username can only contain letters, numbers, dots and underscores");
        if (r.email() == null || !r.email().contains("@"))
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Enter a valid email");
        if (r.password() == null || r.password().length() < 6)
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Password needs at least 6 characters");
        if (r.mobilePhone() == null || !PHONE.matcher(r.mobilePhone().trim()).matches())
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "Enter a valid mobile phone number (7-15 digits, optionally starting with +)");
        if (r.name() == null || r.name().isBlank())
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Enter your first name");
        if (r.surname() == null || r.surname().isBlank())
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Enter your surname");
        if (!Boolean.TRUE.equals(r.consentPrivacy()))
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "You must agree to the data storage terms to create an account");
        // Marketing consent is optional: members can join without agreeing to marketing emails.
        if (users.existsByUsername(r.username().trim().toLowerCase()))
            throw new ResponseStatusException(HttpStatus.CONFLICT, "This username is already taken");
        if (users.existsByEmail(r.email().toLowerCase()))
            throw new ResponseStatusException(HttpStatus.CONFLICT, "This email is already registered");

        AppUser u = new AppUser();
        u.setUsername(r.username().trim().toLowerCase());
        u.setEmail(r.email().toLowerCase());
        u.setMobilePhone(r.mobilePhone().trim());
        u.setName(r.name().trim());
        u.setSurname(r.surname().trim());
        u.setPasswordHash(enc.encode(r.password()));
        u.setRole(Role.USER);
        u.setStatus(AccountStatus.PENDING);
        u.setConsentPrivacy(true);
        u.setConsentMarketing(Boolean.TRUE.equals(r.consentMarketing()));
        u.setConsentAt(Instant.now());
        users.save(u);
        mail.sendWelcomePending(u);
        return new RegisterRes("Your account was created. A club admin needs to approve it before you can log in.");
    }

    @PostMapping("/login")
    public AuthRes login(@RequestBody LoginReq r) {
        String id = r.identifier() == null ? "" : r.identifier().trim().toLowerCase();
        AppUser u = users.findByUsernameOrEmail(id, id)
                .filter(x -> enc.matches(r.password() == null ? "" : r.password(), x.getPasswordHash()))
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Wrong username/email or password"));
        if (u.getStatus() == AccountStatus.PENDING)
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Your account is waiting for a club admin to approve it");
        if (u.getStatus() == AccountStatus.REJECTED) {
            String reason = u.getRejectionReason();
            String suffix = (reason == null || reason.isBlank()) ? "" : ": " + reason;
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Your registration was declined" + suffix);
        }
        return toRes(u);
    }

    private static final String GENERIC_FORGOT_MESSAGE =
            "If an account exists for that email, we've sent a link to reset the password.";

    @PostMapping("/forgot-password")
    public MessageRes forgotPassword(@RequestBody ForgotPasswordReq r) {
        String email = r.email() == null ? "" : r.email().trim().toLowerCase();
        // Always respond the same way whether or not the email is registered, so this endpoint
        // can't be used to probe which addresses have an account.
        users.findByEmail(email).ifPresent(u -> {
            resetTokens.deleteByUserId(u.getId());
            PasswordResetToken t = new PasswordResetToken();
            t.setToken(UUID.randomUUID().toString());
            t.setUserId(u.getId());
            t.setExpiresAt(Instant.now().plus(Duration.ofHours(1)));
            resetTokens.save(t);
            String link = frontendUrl + "/reset-password?token=" + t.getToken();
            mail.sendPasswordReset(u, link);
        });
        return new MessageRes(GENERIC_FORGOT_MESSAGE);
    }

    @PostMapping("/reset-password")
    public MessageRes resetPassword(@RequestBody ResetPasswordReq r) {
        if (r.newPassword() == null || r.newPassword().length() < 6)
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Password needs at least 6 characters");
        PasswordResetToken t = resetTokens.findByToken(r.token() == null ? "" : r.token())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST, "This reset link is invalid or has already been used"));
        if (t.getExpiresAt().isBefore(Instant.now())) {
            resetTokens.delete(t);
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "This reset link has expired. Please request a new one");
        }
        AppUser u = users.findById(t.getUserId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST, "This reset link is invalid or has already been used"));
        u.setPasswordHash(enc.encode(r.newPassword()));
        users.save(u);
        resetTokens.delete(t);
        return new MessageRes("Your password has been changed. You can now log in.");
    }

    private AuthRes toRes(AppUser u) {
        return new AuthRes(jwt.create(u), u.getUsername(), u.getEmail(), u.getName(), u.getSurname(), u.getRole().name(), u.getMemberSince(),
                u.getStatus().name(), Boolean.TRUE.equals(u.getSuspensionRequested()));
    }
}
