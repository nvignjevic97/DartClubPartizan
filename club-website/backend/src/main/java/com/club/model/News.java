package com.club.model;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;
import java.time.Instant;
import java.time.LocalDateTime;
import java.util.Arrays;
import java.util.List;

@Entity @Getter @Setter
public class News {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) private Long id;
    private String title;
    @Column(columnDefinition = "text") private String content;
    private String imageUrl;
    /** When this row was actually inserted - internal bookkeeping only, never shown or editable. */
    private Instant createdAt = Instant.now();
    /**
     * The date/time shown to visitors and used for "latest news" ordering. Defaults to now but,
     * unlike createdAt, an admin can set it to a past date to backdate a news item - e.g. when
     * adding something that actually happened a while ago.
     */
    private LocalDateTime publishedAt = LocalDateTime.now();

    /**
     * Extra photos shown below the article text, newline-separated (not meant to be read
     * directly - use getPhotoUrls()/setPhotoUrls() below). Kept as a single text column rather
     * than a separate linked table, same reasoning as the single-column approach used elsewhere
     * in this app: one admin-managed list per news item, no need for a join.
     */
    @Column(columnDefinition = "text")
    private String extraPhotoUrls;

    public List<String> getPhotoUrls() {
        if (extraPhotoUrls == null || extraPhotoUrls.isBlank()) return List.of();
        return Arrays.stream(extraPhotoUrls.split("\n")).map(String::trim).filter(s -> !s.isBlank()).toList();
    }

    public void setPhotoUrls(List<String> urls) {
        this.extraPhotoUrls = (urls == null || urls.isEmpty()) ? null : String.join("\n", urls);
    }
}
