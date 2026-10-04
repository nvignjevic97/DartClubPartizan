package com.club.model;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

/** One photo in the front-page's rotating banner. Shown in order of sortOrder, ascending. */
@Entity @Getter @Setter
public class HeroImage {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) private Long id;
    @Column(nullable = false) private String url;
    @Column(nullable = false) private int sortOrder;
}
