package com.club.model;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

/** Uploaded site image (logo, hero, news pictures) stored in the database. */
@Entity @Getter @Setter
public class Asset {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) private Long id;
    private String name;
    private String contentType;
    @Lob @JsonIgnore
    @Column(columnDefinition = "LONGBLOB")
    private byte[] data;
}
