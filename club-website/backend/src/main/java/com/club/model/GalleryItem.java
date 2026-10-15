package com.club.model;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

/** One photo or video in the public Gallery page, in sortOrder order within its type. */
@Entity @Getter @Setter
public class GalleryItem {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) private Long id;
    /** "PHOTO" or "VIDEO". */
    @Column(nullable = false) private String type;
    @Column(nullable = false) private String url;
    @Column(nullable = false) private int sortOrder;
}
