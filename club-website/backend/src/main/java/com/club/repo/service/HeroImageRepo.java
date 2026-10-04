package com.club.repo.service;

import com.club.model.HeroImage;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface HeroImageRepo extends JpaRepository<HeroImage, Long> {
    List<HeroImage> findAllByOrderBySortOrderAsc();
}
