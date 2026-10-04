package com.club.mail;

import com.club.model.AppUser;
import com.club.model.SiteSetting;
import com.club.repo.service.SettingRepo;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Service;

import java.util.HashMap;
import java.util.Map;

/**
 * Sends the account-lifecycle emails (welcome/pending, approved, rejected) and subscription
 * reminders. Subject and body come from SiteSetting so the SuperAdmin can edit the wording from
 * the "Email templates" admin tab; a hardcoded fallback is used if a template was never saved.
 * Sending is disabled by default (app.mail.enabled=false) so the app runs without SMTP
 * credentials in dev; a failed send is logged and never blocks the sign-up/approval/reminder flow.
 */
@Service
public class MailService {
    private static final Logger log = LoggerFactory.getLogger(MailService.class);

    private final JavaMailSender sender;
    private final SettingRepo settings;
    private final boolean enabled;
    private final String from;

    public MailService(JavaMailSender sender, SettingRepo settings,
                        @Value("${app.mail.enabled:false}") boolean enabled,
                        @Value("${app.mail.from:no-reply@club.local}") String from) {
        this.sender = sender; this.settings = settings; this.enabled = enabled; this.from = from;
    }

    public void sendWelcomePending(AppUser u) {
        send(u, "emailWelcome",
                "Welcome to {{clubName}} - your account is pending",
                "Hi {{name}},\n\nThanks for signing up for {{clubName}}. Your account is now waiting for a "
                        + "club admin to review it, and you'll be able to log in as soon as it's approved.\n\n"
                        + "Username: {{username}}\n\nSee you soon,\n{{clubName}}",
                null);
    }

    public void sendApproved(AppUser u) {
        send(u, "emailApproved",
                "Your {{clubName}} account has been approved",
                "Hi {{name}},\n\nGood news - your {{clubName}} account has been approved. You can now log in "
                        + "with your username ({{username}}) and password.\n\nSee you soon,\n{{clubName}}",
                null);
    }

    public void sendRejected(AppUser u, String reason) {
        send(u, "emailRejected",
                "About your {{clubName}} account application",
                "Hi {{name}},\n\nWe're sorry to let you know your {{clubName}} account application was not "
                        + "approved.\n\nReason: {{reason}}\n\nIf you think this is a mistake, please contact the club.",
                Map.of("reason", reason == null || reason.isBlank() ? "Not specified" : reason));
    }

    public void sendSuspended(AppUser u) {
        send(u, "emailSuspended",
                "Your {{clubName}} membership has been paused",
                "Hi {{name}},\n\nYour {{clubName}} membership has been suspended - you won't owe any subscription "
                        + "payments while it's paused. You can still log in any time, and you can ask to resume your "
                        + "membership from your account page whenever you're ready.\n\n{{clubName}}",
                null);
    }

    public void sendReactivated(AppUser u) {
        send(u, "emailReactivated",
                "Your {{clubName}} membership is active again",
                "Hi {{name}},\n\nYour {{clubName}} membership has been reactivated. Subscription payments pick up "
                        + "again from here.\n\nSee you soon,\n{{clubName}}",
                null);
    }

    public void sendPasswordReset(AppUser u, String link) {
        send(u, "emailPasswordReset",
                "Reset your {{clubName}} password",
                "Hi {{name}},\n\nWe received a request to reset your {{clubName}} password. Click the link "
                        + "below to choose a new one. This link expires in 1 hour and can only be used once.\n\n"
                        + "{{link}}\n\nIf you didn't ask for this, you can safely ignore this email - your "
                        + "password won't be changed.\n\nSee you soon,\n{{clubName}}",
                Map.of("link", link));
    }

    public void sendPaymentReminder(AppUser u, String month) {
        send(u, "emailReminder",
                "Reminder: your {{month}} subscription at {{clubName}}",
                "Hi {{name}},\n\nJust a friendly reminder that we haven't received your {{month}} subscription "
                        + "payment proof yet for {{clubName}}. Please upload it when you get a chance.\n\n"
                        + "See you soon,\n{{clubName}}",
                Map.of("month", month == null ? "" : month));
    }

    private void send(AppUser u, String settingPrefix, String defaultSubject, String defaultBody, Map<String, String> extraVars) {
        Map<String, String> vars = baseVars(u);
        if (extraVars != null) vars.putAll(extraVars);

        String subject = fill(settings.findById(settingPrefix + "Subject").map(SiteSetting::getValue).orElse(defaultSubject), vars);
        String body = fill(settings.findById(settingPrefix + "Body").map(SiteSetting::getValue).orElse(defaultBody), vars);

        deliver(u, settingPrefix, subject, body);
    }

    /**
     * One-off marketing/newsletter email, with its own ad-hoc subject and body (not stored as a
     * named template). Caller is responsible for only sending this to members who have the
     * marketing consent. Returns true if the message was handed off (or logged, when sending is
     * disabled) without error.
     */
    public boolean sendMarketing(AppUser u, String subject, String body) {
        Map<String, String> vars = baseVars(u);
        return deliver(u, "marketing", fill(subject, vars), fill(body, vars));
    }

    private Map<String, String> baseVars(AppUser u) {
        String clubName = settings.findById("clubName").map(SiteSetting::getValue).orElse("the club");
        Map<String, String> vars = new HashMap<>();
        vars.put("name", nullToEmpty(u.getName()));
        vars.put("surname", nullToEmpty(u.getSurname()));
        vars.put("username", nullToEmpty(u.getUsername()));
        vars.put("clubName", clubName);
        return vars;
    }

    private boolean deliver(AppUser u, String label, String subject, String body) {
        if (!enabled) {
            log.info("Email sending is disabled (app.mail.enabled=false); would send '{}' to {}: {}", label, u.getEmail(), subject);
            return true;
        }
        try {
            SimpleMailMessage msg = new SimpleMailMessage();
            msg.setFrom(from);
            msg.setTo(u.getEmail());
            msg.setSubject(subject);
            msg.setText(body);
            sender.send(msg);
            return true;
        } catch (Exception e) {
            // A broken mail server should never stop a sign-up, approval, reminder, or batch send from going through.
            log.warn("Could not send '{}' email to {}: {}", label, u.getEmail(), e.getMessage());
            return false;
        }
    }

    private static String fill(String template, Map<String, String> vars) {
        String out = template;
        for (var e : vars.entrySet()) out = out.replace("{{" + e.getKey() + "}}", e.getValue());
        return out;
    }

    private static String nullToEmpty(String s) { return s == null ? "" : s; }
}
