package com.club.web;

import com.club.model.AccountStatus;
import com.club.model.AppUser;
import com.club.repo.service.UserRepo;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

/**
 * Self-service membership actions for a logged-in member: asking to pause (suspend) or resume
 * (reactivate) their own membership. Neither takes effect immediately - a SuperAdmin has to
 * confirm the request from the Admin "Accounts" tab, same as a new sign-up needs approval.
 */
@RestController @RequestMapping("/api/account")
public class AccountController {
    public record StatusRes(String status, boolean suspensionRequested) {}

    private final UserRepo users;
    public AccountController(UserRepo users) { this.users = users; }

    @GetMapping("/status")
    public StatusRes status(Authentication auth) {
        AppUser u = user(auth);
        return new StatusRes(u.getStatus().name(), Boolean.TRUE.equals(u.getSuspensionRequested()));
    }

    @PostMapping("/request-suspend")
    public StatusRes requestSuspend(Authentication auth) {
        AppUser u = user(auth);
        if (u.getStatus() != AccountStatus.APPROVED)
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Only an active membership can be paused");
        u.setSuspensionRequested(true);
        users.save(u);
        return new StatusRes(u.getStatus().name(), true);
    }

    @PostMapping("/request-reactivate")
    public StatusRes requestReactivate(Authentication auth) {
        AppUser u = user(auth);
        if (u.getStatus() != AccountStatus.SUSPENDED)
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Only a paused membership can be resumed");
        u.setSuspensionRequested(true);
        users.save(u);
        return new StatusRes(u.getStatus().name(), true);
    }

    /** Lets the member take back a pause/resume request before the club has acted on it. */
    @PostMapping("/cancel-request")
    public StatusRes cancelRequest(Authentication auth) {
        AppUser u = user(auth);
        u.setSuspensionRequested(false);
        users.save(u);
        return new StatusRes(u.getStatus().name(), false);
    }

    private AppUser user(Authentication a) {
        return users.findByEmail((String) a.getPrincipal())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED));
    }
}
