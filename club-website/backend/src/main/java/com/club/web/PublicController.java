package com.club.web;

import com.club.model.*;

import com.club.repo.service.*;
import org.springframework.http.*;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;
import java.time.Duration;
import java.util.*;

/** Everything visitors can read without logging in. */
@RestController @RequestMapping("/api")
public class PublicController {
    private final NewsRepo news; private final GameRepo games; private final StandingRepo standings;
    private final SettingRepo settings; private final AssetRepo assets; private final HeroImageRepo heroImages;

    public PublicController(NewsRepo news, GameRepo games, StandingRepo standings, SettingRepo settings,
                             AssetRepo assets, HeroImageRepo heroImages) {
        this.news = news; this.games = games; this.standings = standings; this.settings = settings;
        this.assets = assets; this.heroImages = heroImages;
    }

    /** Front-page banner photos, in display order. */
    @GetMapping("/hero-images") public List<HeroImage> heroImages() { return heroImages.findAllByOrderBySortOrderAsc(); }

    @GetMapping("/news") public List<News> news() { return news.findAllByOrderByCreatedAtDesc(); }
    @GetMapping("/news/{id}") public News newsOne(@PathVariable Long id) {
        return news.findById(id).orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "News not found"));
    }
    @GetMapping("/matches") public List<Game> allMatches() { return games.findAllByOrderByKickoffDesc(); }
    @GetMapping("/matches/upcoming") public List<Game> upcoming() { return games.findByHomeScoreIsNullOrderByKickoffAsc(); }
    @GetMapping("/matches/results") public List<Game> results() { return games.findByHomeScoreIsNotNullOrderByKickoffDesc(); }

    @GetMapping("/standings")
    public List<Standing> table() {
        List<Standing> l = new ArrayList<>(standings.findAll());
        l.sort(Comparator.comparingInt(Standing::getPoints).reversed()
                .thenComparing(s -> -(s.getGoalsFor() - s.getGoalsAgainst())));
        return l;
    }

    @GetMapping("/config")
    public Map<String, String> config() {
        Map<String, String> m = new LinkedHashMap<>();
        settings.findAll().forEach(s -> m.put(s.getKey(), s.getValue()));
        return m;
    }

    @GetMapping("/assets/{id}")
    public ResponseEntity<byte[]> asset(@PathVariable Long id) {
        Asset a = assets.findById(id).orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND));
        return ResponseEntity.ok().contentType(MediaType.parseMediaType(a.getContentType()))
                .cacheControl(CacheControl.maxAge(Duration.ofDays(7))).body(a.getData());
    }
}
