package com.club.repo.service;

import com.club.model.Sponsor;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface SponsorRepo extends JpaRepository<Sponsor, Long> {
    List<Sponsor> findAllByOrderBySortOrderAsc();
}
