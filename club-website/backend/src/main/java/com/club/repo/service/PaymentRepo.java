package com.club.repo.service;

import com.club.model.AppUser;
import com.club.model.Payment;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface PaymentRepo extends JpaRepository<Payment, Long> {
    Optional<Payment> findByUserAndMonth(AppUser user, String month);
    List<Payment> findByUserOrderByMonthDesc(AppUser user);
    List<Payment> findByMonth(String month);
}
