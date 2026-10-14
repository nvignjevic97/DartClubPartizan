package com.club.model;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;
import java.time.Instant;
import java.time.LocalDateTime;

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
}
