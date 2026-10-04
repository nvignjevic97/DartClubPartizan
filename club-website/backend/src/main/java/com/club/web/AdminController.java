package com.club.web;

import com.club.mail.MailService;
import com.club.model.*;

import com.club.repo.service.*;
import org.springframework.http.*;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;
import java.io.IOException;
import java.time.YearMonth;
import java.time.temporal.ChronoUnit;
import java.util.*;

/** SuperAdmin only (enforced in SecurityConfig): content management and subscription review. */
@RestController @RequestMapping("/api/admin")
public class AdminController {
    public record SubscriptionRow(Long userId, String fullName, String email, String status, Long paymentId, String fileName) {}
    public record PendingAccountRow(Long id, String username, String email, String name, String surname, String mobilePhone) {}
    public record PaymentRow(Long id, String month, String status, String fileName, String uploadedAt) {}
    public record AccountDetail(Long id, String username, String email, String name, String surname, String mobilePhone, String memberSince, List<PaymentRow> payments) {}

    public record HeroImageReq(String url) {}
    public record MemberRow(Long userId, String fullName, String email) {}
    public record MarketingSendReq(String subject, String body, List<Long> recipientIds) {}
    public record MarketingSendResult(int sent, int failed, int skipped) {}
    public record ArrearsRow(Long userId, String fullName, String email, String status) {}
    public record MonthArrears(String month, List<ArrearsRow> owing) {}
    public record MemberStatusRow(Long id, String fullName, String email, String status, boolean suspensionRequested) {}

    private final NewsRepo news; private final GameRepo games; private final StandingRepo standings;
    private final SettingRepo settings; private final AssetRepo assets; private final PaymentRepo payments; private final UserRepo users;
    private final HeroImageRepo heroImages; private final MailService mail;

    public AdminController(NewsRepo news, GameRepo games, StandingRepo standings, SettingRepo settings,
                           AssetRepo assets, PaymentRepo payments, UserRepo users, HeroImageRepo heroImages, MailService mail) {
        this.news = news; this.games = games; this.standings = standings; this.settings = settings;
        this.assets = assets; this.payments = payments; this.users = users; this.heroImages = heroImages; this.mail = mail;
    }

    // ---- news ----
    @PostMapping("/news") public News createNews(@RequestBody News n) { n.setId(null); n.setCreatedAt(java.time.Instant.now()); return news.save(n); }
    @PutMapping("/news/{id}") public News updateNews(@PathVariable Long id, @RequestBody News n) {
        News old = news.findById(id).orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND));
        old.setTitle(n.getTitle()); old.setContent(n.getContent()); old.setImageUrl(n.getImageUrl());
        return news.save(old);
    }
    @DeleteMapping("/news/{id}") public void deleteNews(@PathVariable Long id) { news.deleteById(id); }

    // ---- matches ----
    @PostMapping("/matches") public Game createGame(@RequestBody Game g) { g.setId(null); return games.save(g); }
    @PutMapping("/matches/{id}") public Game updateGame(@PathVariable Long id, @RequestBody Game g) { g.setId(id); return games.save(g); }
    @DeleteMapping("/matches/{id}") public void deleteGame(@PathVariable Long id) { games.deleteById(id); }

    // ---- league table ----
    @PostMapping("/standings") public Standing createStanding(@RequestBody Standing s) { s.setId(null); return standings.save(s); }
    @PutMapping("/standings/{id}") public Standing updateStanding(@PathVariable Long id, @RequestBody Standing s) { s.setId(id); return standings.save(s); }
    @DeleteMapping("/standings/{id}") public void deleteStanding(@PathVariable Long id) { standings.deleteById(id); }

    // ---- site settings + images ----
    @PutMapping("/config")
    public Map<String, String> saveConfig(@RequestBody Map<String, String> values) {
        values.forEach((k, v) -> settings.save(new SiteSetting(k, v)));
        return values;
    }

    @PostMapping(value = "/assets", consumes = "multipart/form-data")
    public Map<String, String> uploadAsset(@RequestParam MultipartFile file) throws IOException {
        String ct = file.getContentType() == null ? "" : file.getContentType();
        if (!ct.startsWith("image/")) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Only images are allowed");
        Asset a = new Asset(); a.setName(file.getOriginalFilename()); a.setContentType(ct); a.setData(file.getBytes());
        return Map.of("url", "/api/assets/" + assets.save(a).getId());
    }

    // ---- front-page banner photos ----
    @GetMapping("/hero-images") public List<HeroImage> listHeroImages() { return heroImages.findAllByOrderBySortOrderAsc(); }

    @PostMapping("/hero-images")
    public HeroImage addHeroImage(@RequestBody HeroImageReq r) {
        if (r.url() == null || r.url().isBlank())
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Upload an image first");
        int next = heroImages.findAllByOrderBySortOrderAsc().stream().mapToInt(HeroImage::getSortOrder).max().orElse(-1) + 1;
        HeroImage h = new HeroImage(); h.setUrl(r.url()); h.setSortOrder(next);
        return heroImages.save(h);
    }

    @DeleteMapping("/hero-images/{id}") public void deleteHeroImage(@PathVariable Long id) { heroImages.deleteById(id); }

    /** Swaps this photo's position with the one immediately before ("up") or after ("down") it. */
    @PutMapping("/hero-images/{id}/move")
    public List<HeroImage> moveHeroImage(@PathVariable Long id, @RequestParam String dir) {
        List<HeroImage> ordered = heroImages.findAllByOrderBySortOrderAsc();
        int i = -1; for (int k = 0; k < ordered.size(); k++) if (ordered.get(k).getId().equals(id)) { i = k; break; }
        if (i < 0) throw new ResponseStatusException(HttpStatus.NOT_FOUND);
        int j = "up".equals(dir) ? i - 1 : i + 1;
        if (j >= 0 && j < ordered.size()) {
            HeroImage a = ordered.get(i), b = ordered.get(j);
            int tmp = a.getSortOrder(); a.setSortOrder(b.getSortOrder()); b.setSortOrder(tmp);
            heroImages.save(a); heroImages.save(b);
        }
        return heroImages.findAllByOrderBySortOrderAsc();
    }

    // ---- subscriptions ----
    /** True unless the member has a memberSince month set that is after the given month - i.e. they weren't a member yet. */
    private boolean eligible(AppUser u, YearMonth month) {
        String since = u.getMemberSince();
        return since == null || since.isBlank() || !month.isBefore(YearMonth.parse(since));
    }

    /** Every member with their status for the given month: PAID, PENDING (document uploaded) or NONE. Members who hadn't started yet that month are left out entirely. */
    @GetMapping("/subscriptions")
    public List<SubscriptionRow> subscriptions(@RequestParam String month) {
        YearMonth ym = YearMonth.parse(month);
        Map<Long, Payment> byUser = new HashMap<>();
        payments.findByMonth(month).forEach(p -> byUser.put(p.getUser().getId(), p));
        List<SubscriptionRow> rows = new ArrayList<>();
        for (AppUser u : users.findByRoleAndStatusOrderBySurnameAscNameAsc(Role.USER, AccountStatus.APPROVED)) {
            if (!eligible(u, ym)) continue;
            Payment p = byUser.get(u.getId());
            rows.add(new SubscriptionRow(u.getId(), u.getName() + " " + u.getSurname(), u.getEmail(),
                    p == null ? "NONE" : p.getStatus().name(), p == null ? null : p.getId(), p == null ? null : p.getFileName()));
        }
        return rows;
    }

    /**
     * Every month from {@code from} to {@code to} (inclusive, "YYYY-MM"; defaults to the last 6
     * months up to the current one) with the members who are NOT marked paid for it (status
     * NONE or PENDING) - the "who owes money" overview across months, most recent month first.
     */
    @GetMapping("/subscriptions/arrears")
    public List<MonthArrears> arrears(@RequestParam(required = false) String from, @RequestParam(required = false) String to) {
        YearMonth toYm = (to == null || to.isBlank()) ? YearMonth.now() : YearMonth.parse(to);
        YearMonth fromYm = (from == null || from.isBlank()) ? toYm.minusMonths(5) : YearMonth.parse(from);
        if (fromYm.isAfter(toYm)) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "\"From\" must be before \"to\"");
        if (ChronoUnit.MONTHS.between(fromYm, toYm) > 36)
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Pick a range of 36 months or fewer");

        List<AppUser> members = users.findByRoleAndStatusOrderBySurnameAscNameAsc(Role.USER, AccountStatus.APPROVED);
        List<MonthArrears> out = new ArrayList<>();
        for (YearMonth ym = fromYm; !ym.isAfter(toYm); ym = ym.plusMonths(1)) {
            String month = ym.toString();
            Map<Long, Payment> byUser = new HashMap<>();
            payments.findByMonth(month).forEach(p -> byUser.put(p.getUser().getId(), p));
            List<ArrearsRow> owing = new ArrayList<>();
            for (AppUser u : members) {
                if (!eligible(u, ym)) continue;
                Payment p = byUser.get(u.getId());
                String status = p == null ? "NONE" : p.getStatus().name();
                if (!"PAID".equals(status))
                    owing.add(new ArrearsRow(u.getId(), u.getName() + " " + u.getSurname(), u.getEmail(), status));
            }
            out.add(new MonthArrears(month, owing));
        }
        Collections.reverse(out);
        return out;
    }

    // ---- marketing emails ----
    /** Approved members who ticked the marketing-consent box at sign-up - the only people a marketing email may go to. */
    @GetMapping("/marketing/recipients")
    public List<MemberRow> marketingRecipients() {
        return users.findByRoleAndStatusOrderBySurnameAscNameAsc(Role.USER, AccountStatus.APPROVED).stream()
                .filter(u -> Boolean.TRUE.equals(u.getConsentMarketing()))
                .map(u -> new MemberRow(u.getId(), u.getName() + " " + u.getSurname(), u.getEmail()))
                .toList();
    }

    /**
     * Sends a one-off marketing email with a configurable subject/body to either everyone who
     * opted in (recipientIds empty/omitted) or a chosen subset of them. Anyone without marketing
     * consent is silently excluded even if their id is passed in.
     */
    @PostMapping("/marketing/send")
    public MarketingSendResult sendMarketing(@RequestBody MarketingSendReq req) {
        if (req.subject() == null || req.subject().isBlank() || req.body() == null || req.body().isBlank())
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Enter a subject and a message");

        List<AppUser> consented = users.findByRoleAndStatusOrderBySurnameAscNameAsc(Role.USER, AccountStatus.APPROVED).stream()
                .filter(u -> Boolean.TRUE.equals(u.getConsentMarketing()))
                .toList();

        List<AppUser> targets;
        int skipped;
        if (req.recipientIds() == null || req.recipientIds().isEmpty()) {
            targets = consented;
            skipped = 0;
        } else {
            Set<Long> ids = new HashSet<>(req.recipientIds());
            targets = consented.stream().filter(u -> ids.contains(u.getId())).toList();
            skipped = ids.size() - targets.size();
        }
        if (targets.isEmpty())
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "No eligible recipients - members must have accepted marketing emails");

        int sent = 0, failed = 0;
        for (AppUser u : targets) {
            if (mail.sendMarketing(u, req.subject(), req.body())) sent++; else failed++;
        }
        return new MarketingSendResult(sent, failed, skipped);
    }

    // ---- account approval ----
    /** Sign-ups waiting for a SuperAdmin decision. */
    @GetMapping("/accounts/pending")
    public List<PendingAccountRow> pendingAccounts() {
        return users.findByStatusOrderBySurnameAscNameAsc(AccountStatus.PENDING).stream()
                .map(u -> new PendingAccountRow(u.getId(), u.getUsername(), u.getEmail(), u.getName(), u.getSurname(), u.getMobilePhone()))
                .toList();
    }

    @PutMapping("/accounts/{id}/approve")
    public void approveAccount(@PathVariable Long id, @RequestBody(required = false) Map<String, String> body) {
        AppUser u = users.findById(id).orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND));
        u.setStatus(AccountStatus.APPROVED);
        u.setRejectionReason(null);
        String since = body == null ? null : body.get("memberSince");
        if (since != null && !since.isBlank()) {
            try { YearMonth.parse(since); } catch (Exception e) { throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Month must look like 2026-03"); }
            u.setMemberSince(since);
        } else if (u.getMemberSince() == null || u.getMemberSince().isBlank()) {
            u.setMemberSince(YearMonth.now().toString());
        }
        users.save(u);
        mail.sendApproved(u);
    }

    /** Backdates (or clears) the month a member is expected to start paying from - e.g. for a member who actually joined before they got an account here. */
    @PutMapping("/accounts/{id}/member-since")
    public void setMemberSince(@PathVariable Long id, @RequestBody Map<String, String> body) {
        String month = body.get("month");
        if (month != null && !month.isBlank()) {
            try { YearMonth.parse(month); } catch (Exception e) { throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Month must look like 2026-03"); }
        }
        AppUser u = users.findById(id).orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND));
        u.setMemberSince(month == null || month.isBlank() ? null : month);
        users.save(u);
    }

    @PutMapping("/accounts/{id}/reject")
    public void rejectAccount(@PathVariable Long id, @RequestBody Map<String, String> body) {
        String reason = body.get("reason");
        if (reason == null || reason.isBlank())
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Enter a reason for the member");
        AppUser u = users.findById(id).orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND));
        u.setStatus(AccountStatus.REJECTED);
        u.setRejectionReason(reason.trim());
        users.save(u);
        mail.sendRejected(u, reason.trim());
    }

    // ---- suspend / reactivate membership ----
    /** Every approved or suspended member, for the "suspend / reactivate" list - active members first. */
    @GetMapping("/accounts/members")
    public List<MemberStatusRow> members() {
        List<AppUser> all = new ArrayList<>(users.findByRoleAndStatusOrderBySurnameAscNameAsc(Role.USER, AccountStatus.APPROVED));
        all.addAll(users.findByRoleAndStatusOrderBySurnameAscNameAsc(Role.USER, AccountStatus.SUSPENDED));
        return all.stream()
                .map(u -> new MemberStatusRow(u.getId(), u.getName() + " " + u.getSurname(), u.getEmail(),
                        u.getStatus().name(), Boolean.TRUE.equals(u.getSuspensionRequested())))
                .toList();
    }

    /** Admin pauses a member's membership directly - they stop owing subscriptions and can still log in. */
    @PutMapping("/accounts/{id}/suspend")
    public void suspendAccount(@PathVariable Long id) {
        AppUser u = users.findById(id).orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND));
        if (u.getStatus() != AccountStatus.APPROVED)
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Only an active member can be suspended");
        u.setStatus(AccountStatus.SUSPENDED);
        u.setSuspensionRequested(false);
        users.save(u);
        mail.sendSuspended(u);
    }

    /** Admin resumes a suspended member's membership directly. */
    @PutMapping("/accounts/{id}/reactivate")
    public void reactivateAccount(@PathVariable Long id) {
        AppUser u = users.findById(id).orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND));
        if (u.getStatus() != AccountStatus.SUSPENDED)
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Only a suspended member can be reactivated");
        u.setStatus(AccountStatus.APPROVED);
        u.setSuspensionRequested(false);
        users.save(u);
        mail.sendReactivated(u);
    }

    /** Dismisses a member's pause/resume request without changing their membership status. */
    @PutMapping("/accounts/{id}/decline-suspension-request")
    public void declineSuspensionRequest(@PathVariable Long id) {
        AppUser u = users.findById(id).orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND));
        u.setSuspensionRequested(false);
        users.save(u);
    }

    /** Full profile + every month on file for one member, for the "view history" popup. */
    @GetMapping("/accounts/{id}")
    public AccountDetail accountDetail(@PathVariable Long id) {
        AppUser u = users.findById(id).orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND));
        List<PaymentRow> rows = payments.findByUserOrderByMonthDesc(u).stream()
                .map(p -> new PaymentRow(p.getId(), p.getMonth(), p.getStatus().name(), p.getFileName(),
                        p.getUploadedAt() == null ? null : p.getUploadedAt().toString()))
                .toList();
        return new AccountDetail(u.getId(), u.getUsername(), u.getEmail(), u.getName(), u.getSurname(), u.getMobilePhone(), u.getMemberSince(), rows);
    }

    /** Nudges a member who hasn't uploaded (or hasn't been confirmed) for the given month. */
    @PostMapping("/accounts/{id}/remind")
    public void remindAccount(@PathVariable Long id, @RequestBody Map<String, String> body) {
        String channel = body.getOrDefault("channel", "EMAIL");
        String month = body.get("month");
        AppUser u = users.findById(id).orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND));
        if ("PHONE".equalsIgnoreCase(channel))
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "SMS/call reminders aren't set up yet");
        mail.sendPaymentReminder(u, month);
    }

    @GetMapping("/payments/{id}/file")
    public ResponseEntity<byte[]> file(@PathVariable Long id) {
        Payment p = payments.findById(id).orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND));
        return ResponseEntity.ok().contentType(MediaType.parseMediaType(p.getContentType())).body(p.getData());
    }

    @PutMapping("/payments/{id}/status")
    public void setStatus(@PathVariable Long id, @RequestBody Map<String, String> body) {
        Payment p = payments.findById(id).orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND));
        p.setStatus(PaymentStatus.valueOf(body.get("status")));
        payments.save(p);
    }
}
