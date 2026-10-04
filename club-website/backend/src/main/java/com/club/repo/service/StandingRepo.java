package com.club.repo.service;

import com.club.model.Standing;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface StandingRepo extends JpaRepository<Standing, Long> {
    List<Standing> findAllByOrderByPointsDesc();
}
