package com.club.config;

import com.club.model.*;
import com.club.repo.service.SettingRepo;
import com.club.repo.service.UserRepo;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import javax.sql.DataSource;
import java.sql.Connection;
import java.sql.Statement;
import java.util.LinkedHashMap;
import java.util.Map;

/** Creates the SuperAdmin and default site settings on first start. */
@Component
public class DataInitializer implements CommandLineRunner {
    private static final Logger log = LoggerFactory.getLogger(DataInitializer.class);

    private final UserRepo users; private final SettingRepo settings; private final PasswordEncoder enc; private final DataSource dataSource;
    @Value("${app.admin.email}") String adminEmail;
    @Value("${app.admin.password}") String adminPassword;
    @Value("${app.admin.username:admin}") String adminUsername;

    public DataInitializer(UserRepo users, SettingRepo settings, PasswordEncoder enc, DataSource dataSource) {
        this.users = users; this.settings = settings; this.enc = enc; this.dataSource = dataSource;
    }

    @Override
    public void run(String... args) {
        migrateStatusColumn();
        if (!users.existsByEmail(adminEmail)) {
            AppUser a = new AppUser();
            a.setUsername(adminUsername); a.setEmail(adminEmail);
            a.setName("Super"); a.setSurname("Admin"); a.setMobilePhone("");
            a.setPasswordHash(enc.encode(adminPassword)); a.setRole(Role.SUPER_ADMIN);
            a.setStatus(AccountStatus.APPROVED);
            a.setConsentPrivacy(true); a.setConsentMarketing(true); a.setConsentAt(java.time.Instant.now());
            users.save(a);
        }
        Map<String, String> d = new LinkedHashMap<>();
        d.put("clubName", "FC Your Club");
        d.put("tagline", "Play together. Win together.");
        d.put("logoUrl", "");
        d.put("heroImageUrl", "");
        d.put("aboutText", "Tell the story of your club here: when it was founded, where it plays and what it stands for.");
        d.put("accentColor", "#3d3d3d");
        d.put("contactEmail", "info@club.local");
        d.put("footerText", "© Your Club. All rights reserved.");

        // Editable from the "Email templates" admin tab. {{name}}, {{surname}}, {{username}}, {{clubName}}
        // and (rejection only) {{reason}} are replaced before sending.
        d.put("emailWelcomeSubject", "Welcome to {{clubName}} - your account is pending");
        d.put("emailWelcomeBody", "Hi {{name}},\n\nThanks for signing up for {{clubName}}. Your account is now "
                + "waiting for a club admin to review it, and you'll be able to log in as soon as it's approved.\n\n"
                + "Username: {{username}}\n\nSee you soon,\n{{clubName}}");
        d.put("emailApprovedSubject", "Your {{clubName}} account has been approved");
        d.put("emailApprovedBody", "Hi {{name}},\n\nGood news - your {{clubName}} account has been approved. "
                + "You can now log in with your username ({{username}}) and password.\n\nSee you soon,\n{{clubName}}");
        d.put("emailRejectedSubject", "About your {{clubName}} account application");
        d.put("emailRejectedBody", "Hi {{name}},\n\nWe're sorry to let you know your {{clubName}} account "
                + "application was not approved.\n\nReason: {{reason}}\n\nIf you think this is a mistake, please "
                + "contact the club.");
        d.put("emailReminderSubject", "Reminder: your {{month}} subscription at {{clubName}}");
        d.put("emailReminderBody", "Hi {{name}},\n\nJust a friendly reminder that we haven't received your "
                + "{{month}} subscription payment proof yet for {{clubName}}. Please upload it when you get a "
                + "chance.\n\nSee you soon,\n{{clubName}}");

        // The two required sign-up checkboxes. Editable from Admin -> Site settings. {{clubName}} is replaced
        // on the sign-up page before display.
        d.put("consentPrivacyText", "I agree that {{clubName}} may store and process my personal information "
                + "(name, contact details and uploaded subscription documents) in its database to manage my "
                + "membership.");
        d.put("consentMarketingText", "I agree that {{clubName}} may use my email address to send me marketing "
                + "communications, including by sharing it with third-party services used only for marketing "
                + "purposes.");

        d.forEach((k, v) -> { if (!settings.existsById(k)) settings.save(new SiteSetting(k, v)); });
    }

    /**
     * On an existing database, MariaDB originally created "status" as a native SQL
     * ENUM('PENDING','APPROVED','REJECTED') - and Hibernate's ddl-auto:update never widens an
     * existing column's type, so adding the AccountStatus.SUSPENDED constant alone isn't enough:
     * saving a user with that status would fail with "Data truncated for column 'status'". Widen
     * it to a plain varchar on every startup (harmless/idempotent once it's already varchar) so
     * this fixes itself with no manual SQL, here or for any status added later.
     */
    private void migrateStatusColumn() {
        try (Connection c = dataSource.getConnection(); Statement s = c.createStatement()) {
            s.execute("ALTER TABLE users MODIFY COLUMN status VARCHAR(20) NOT NULL DEFAULT 'PENDING'");
        } catch (Exception e) {
            log.warn("Could not widen users.status to varchar (safe to ignore if it's already varchar): {}", e.getMessage());
        }
    }
}
