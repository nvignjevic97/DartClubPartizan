package com.club.model;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

/** One founder/board member shown on the "About us -> Founders" page, in sortOrder order. */
@Entity @Getter @Setter
public class Founder {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) private Long id;
    @Column(nullable = false) private String name;
    @Column(columnDefinition = "text") private String text;
    private String imageUrl;
    @Column(nullable = false) private int sortOrder;
}
