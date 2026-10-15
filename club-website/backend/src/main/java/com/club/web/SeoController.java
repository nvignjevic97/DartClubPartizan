package com.club.web;

import com.club.model.Founder;
import com.club.model.News;
import com.club.repo.service.FounderRepo;
import com.club.repo.service.NewsRepo;
import com.club.repo.service.SettingRepo;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RestController;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * Bot-facing plain-HTML snapshots of the public pages, plus robots.txt and sitemap.xml.
 *
 * The real site is a React single-page app. Google renders JavaScript fine, but most AI crawlers
 * (and plenty of older bots) just fetch a page's raw HTML and never run its script - to them an
 * SPA is an empty shell. Rather than rewriting the frontend as a server-rendered app, nginx sends
 * known crawler user-agents to these endpoints instead of the SPA for the handful of public routes
 * (see nginx.conf's $is_bot map); everyone else keeps getting the normal React app unchanged.
 */
@RestController
public class SeoController {
    private final NewsRepo news;
    private final FounderRepo founders;
    private final SettingRepo settings;

    @Value("${app.frontend-url:http://localhost:5173}")
    private String site;

    public SeoController(NewsRepo news, FounderRepo founders, SettingRepo settings) {
        this.news = news; this.founders = founders; this.settings = settings;
    }

    private Map<String, String> cfg() {
        Map<String, String> m = new LinkedHashMap<>();
        settings.findAll().forEach(s -> m.put(s.getKey(), s.getValue()));
        return m;
    }

    private static String esc(String s) {
        if (s == null) return "";
        return s.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")
                .replace("\"", "&quot;").replace("'", "&#39;");
    }

    // Mirrors the frontend's tiny link syntax (frontend/src/richtext.jsx): [label](https://url).
    private static final Pattern LINK_RE = Pattern.compile("\\[([^\\]]+)]\\((https?://[^\\s)]+)\\)");

    /** Escapes everything first, then turns the (now-escaped) [label](url) markers into real
     * &lt;a&gt; tags and keeps line breaks - so admin-entered text is both safe and link-aware. */
    private static String richTextToHtml(String text) {
        String escaped = esc(text);
        Matcher m = LINK_RE.matcher(escaped);
        StringBuilder out = new StringBuilder();
        int last = 0;
        while (m.find()) {
            out.append(escaped, last, m.start());
            out.append("<a href=\"").append(m.group(2)).append("\" target=\"_blank\" rel=\"noopener noreferrer\">")
                    .append(m.group(1)).append("</a>");
            last = m.end();
        }
        out.append(escaped, last, escaped.length());
        return out.toString().replace("\n", "<br>");
    }

    private String page(String title, String description, String canonicalPath, String bodyHtml, String jsonLd) {
        String canonical = site + canonicalPath;
        return "<!doctype html><html lang=\"sr\"><head><meta charset=\"UTF-8\">"
                + "<meta name=\"viewport\" content=\"width=device-width, initial-scale=1\">"
                + "<title>" + esc(title) + "</title>"
                + "<meta name=\"description\" content=\"" + esc(description) + "\">"
                + "<link rel=\"canonical\" href=\"" + esc(canonical) + "\">"
                + "<meta property=\"og:type\" content=\"website\">"
                + "<meta property=\"og:title\" content=\"" + esc(title) + "\">"
                + "<meta property=\"og:description\" content=\"" + esc(description) + "\">"
                + "<meta property=\"og:url\" content=\"" + esc(canonical) + "\">"
                + (jsonLd != null ? "<script type=\"application/ld+json\">" + jsonLd + "</script>" : "")
                + "</head><body>" + bodyHtml + "</body></html>";
    }

    private static String trim(String s, int max) {
        if (s == null) return "";
        String plain = LINK_RE.matcher(s).replaceAll("$1");
        return plain.length() > max ? plain.substring(0, max - 1) + "…" : plain;
    }

    @GetMapping(value = "/seo/home", produces = MediaType.TEXT_HTML_VALUE)
    public String home() {
        Map<String, String> c = cfg();
        String clubName = c.getOrDefault("clubName", "Pikado Klub Partizan");
        String tagline = c.getOrDefault("tagline", "");
        List<News> latest = news.findAllByOrderByPublishedAtDesc().stream().limit(10).toList();

        StringBuilder body = new StringBuilder();
        body.append("<h1>").append(esc(clubName)).append("</h1>");
        if (!tagline.isBlank()) body.append("<p>").append(esc(tagline)).append("</p>");
        body.append("<h2>").append("Latest news").append("</h2>");
        for (News n : latest) {
            body.append("<article><h3><a href=\"").append(site).append("/news/").append(n.getId()).append("\">")
                    .append(esc(n.getTitle())).append("</a></h3><p>").append(n.getPublishedAt()).append("</p>")
                    .append("<div>").append(richTextToHtml(n.getContent())).append("</div></article>");
        }
        body.append("<p><a href=\"").append(site).append("/about\">About the club</a></p>");

        String desc = tagline.isBlank() ? clubName : tagline;
        String jsonLd = "{\"@context\":\"https://schema.org\",\"@type\":\"SportsOrganization\",\"name\":\""
                + clubName.replace("\"", "'") + "\",\"url\":\"" + site + "/\",\"sport\":\"Darts\"}";
        return page(clubName, desc, "/", body.toString(), jsonLd);
    }

    @GetMapping(value = "/seo/news", produces = MediaType.TEXT_HTML_VALUE)
    public String newsList() {
        List<News> all = news.findAllByOrderByPublishedAtDesc();
        StringBuilder body = new StringBuilder("<h1>News</h1>");
        for (News n : all) {
            body.append("<article><h2><a href=\"").append(site).append("/news/").append(n.getId()).append("\">")
                    .append(esc(n.getTitle())).append("</a></h2><p>").append(n.getPublishedAt()).append("</p>"
                            + "<p>").append(esc(trim(n.getContent(), 300))).append("</p></article>");
        }
        return page("News", "All club news, matches and results", "/news", body.toString(), null);
    }

    @GetMapping(value = "/seo/news/{id}", produces = MediaType.TEXT_HTML_VALUE)
    public String newsOne(@PathVariable Long id) {
        News n = news.findById(id).orElse(null);
        if (n == null) return page("Not found", "This news item does not exist", "/news", "<h1>Not found</h1>", null);

        String desc = trim(n.getContent(), 160);
        String body = "<h1>" + esc(n.getTitle()) + "</h1><p>" + n.getPublishedAt() + "</p><div>"
                + richTextToHtml(n.getContent()) + "</div><p><a href=\"" + site + "/news\">Back to all news</a></p>";
        String jsonLd = "{\"@context\":\"https://schema.org\",\"@type\":\"Article\",\"headline\":\""
                + n.getTitle().replace("\"", "'") + "\",\"datePublished\":\"" + n.getPublishedAt() + "\"}";
        return page(n.getTitle(), desc, "/news/" + id, body, jsonLd);
    }

    @GetMapping(value = "/seo/about", produces = MediaType.TEXT_HTML_VALUE)
    public String about() {
        Map<String, String> c = cfg();
        String clubName = c.getOrDefault("clubName", "Pikado Klub Partizan");

        StringBuilder body = new StringBuilder("<h1>About ").append(esc(clubName)).append("</h1>");
        body.append("<div>").append(richTextToHtml(c.get("aboutText"))).append("</div>");

        List<Founder> fl = founders.findAllByOrderBySortOrderAsc();
        if (!fl.isEmpty()) {
            body.append("<h2>Founders</h2>");
            for (Founder f : fl)
                body.append("<h3>").append(esc(f.getName())).append("</h3><div>")
                        .append(richTextToHtml(f.getText())).append("</div>");
        }

        String statute = c.get("statuteText");
        if (statute != null && !statute.isBlank()) {
            body.append("<h2>Club statute</h2><div>").append(richTextToHtml(statute)).append("</div>");
            String docUrl = c.get("statuteDocumentUrl");
            if (docUrl != null && !docUrl.isBlank())
                body.append("<p><a href=\"").append(site).append(docUrl).append("\">Download the statute document</a></p>");
        }

        return page("About — " + clubName, "About " + clubName + ", its founders and its statute", "/about", body.toString(), null);
    }

    @GetMapping(value = "/robots.txt", produces = MediaType.TEXT_PLAIN_VALUE)
    public String robots() {
        return "User-agent: *\n"
                + "Allow: /\n"
                + "Disallow: /admin\n"
                + "Disallow: /account\n"
                + "Disallow: /login\n"
                + "Disallow: /reset-password\n"
                + "Sitemap: " + site + "/sitemap.xml\n";
    }

    @GetMapping(value = "/sitemap.xml", produces = MediaType.APPLICATION_XML_VALUE)
    public String sitemap() {
        StringBuilder xml = new StringBuilder("<?xml version=\"1.0\" encoding=\"UTF-8\"?>");
        xml.append("<urlset xmlns=\"http://www.sitemaps.org/schemas/sitemap/0.9\">");
        xml.append(url(site + "/", null)).append(url(site + "/news", null)).append(url(site + "/about", null));
        for (News n : news.findAllByOrderByPublishedAtDesc())
            xml.append(url(site + "/news/" + n.getId(), n.getPublishedAt() == null ? null : n.getPublishedAt().toLocalDate().toString()));
        xml.append("</urlset>");
        return xml.toString();
    }

    private static String url(String loc, String lastmod) {
        return "<url><loc>" + esc(loc) + "</loc>" + (lastmod != null ? "<lastmod>" + lastmod + "</lastmod>" : "") + "</url>";
    }
}
