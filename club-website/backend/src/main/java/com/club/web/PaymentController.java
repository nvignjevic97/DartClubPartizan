package com.club.web;

import com.club.model.*;

import com.club.repo.service.PaymentRepo;
import com.club.repo.service.UserRepo;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;
import java.io.IOException;
import java.time.YearMonth;
import java.util.List;

/** Logged-in members upload one subscription proof per month. */
@RestController @RequestMapping("/api/payments")
public class PaymentController {
    private final PaymentRepo payments; private final UserRepo users;
    public PaymentController(PaymentRepo payments, UserRepo users) { this.payments = payments; this.users = users; }

    @GetMapping("/me")
    public List<Payment> mine(Authentication auth) { return payments.findByUserOrderByMonthDesc(user(auth)); }

    @PostMapping(consumes = "multipart/form-data")
    public Payment upload(Authentication auth, @RequestParam String month, @RequestParam MultipartFile file) throws IOException {
        if (!month.matches("\\d{4}-(0[1-9]|1[0-2])"))
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Month must look like 2026-09");
        String ct = file.getContentType() == null ? "" : file.getContentType();
        if (file.isEmpty() || !(ct.startsWith("image/") || ct.equals("application/pdf")))
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Upload a photo or a PDF");
        AppUser u = user(auth);
        if (u.getMemberSince() != null && !u.getMemberSince().isBlank() && YearMonth.parse(month).isBefore(YearMonth.parse(u.getMemberSince())))
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "You weren't a member yet in " + month);
        Payment p = payments.findByUserAndMonth(u, month).orElseGet(() -> {
            Payment n = new Payment(); n.setUser(u); n.setMonth(month); return n;
        });
        if (p.getStatus() == PaymentStatus.PAID)
            throw new ResponseStatusException(HttpStatus.CONFLICT, "This month is already confirmed");
        p.setFileName(file.getOriginalFilename()); p.setContentType(ct); p.setData(file.getBytes());
        p.setUploadedAt(java.time.Instant.now());
        return payments.save(p);
    }

    private AppUser user(Authentication a) {
        return users.findByEmail((String) a.getPrincipal())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED));
    }
}
