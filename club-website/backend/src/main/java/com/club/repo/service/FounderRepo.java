package com.club.repo.service;

import com.club.model.Founder;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface FounderRepo extends JpaRepository<Founder, Long> {
    List<Founder> findAllByOrderBySortOrderAsc();
}
