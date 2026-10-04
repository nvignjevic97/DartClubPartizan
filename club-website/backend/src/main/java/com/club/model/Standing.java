package com.club.model;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

@Entity @Table(name = "standings") @Getter @Setter
public class Standing {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) private Long id;
    private String team;
    private int played, won, drawn, lost, goalsFor, goalsAgainst, points;
}
