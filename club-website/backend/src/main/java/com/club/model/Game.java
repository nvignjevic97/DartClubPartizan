package com.club.model;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;
import java.time.LocalDateTime;

/** A match. Scores are null until the game is played. */
@Entity @Table(name = "matches") @Getter @Setter
public class Game {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) private Long id;
    private String homeTeam;
    private String awayTeam;
    private LocalDateTime kickoff;
    private String venue;
    private Integer homeScore;
    private Integer awayScore;
}
