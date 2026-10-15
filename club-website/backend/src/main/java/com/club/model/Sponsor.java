package com.club.model;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

/** One sponsor logo shown in the site footer, in sortOrder order. */
@Entity @Getter @Setter
public class Sponsor {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) private Long id;
    @Column(nullable = false) private String name;
    @Column(nullable = false) private String imageUrl;
    private String linkUrl;
    @Column(nullable = false) private int sortOrder;
}
