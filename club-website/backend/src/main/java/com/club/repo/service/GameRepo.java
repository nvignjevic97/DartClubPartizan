package com.club.repo.service;

import com.club.model.Game;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface GameRepo extends JpaRepository<Game, Long> {
    List<Game> findAllByOrderByKickoffDesc();
    List<Game> findByHomeScoreIsNullOrderByKickoffAsc();
    List<Game> findByHomeScoreIsNotNullOrderByKickoffDesc();
}
