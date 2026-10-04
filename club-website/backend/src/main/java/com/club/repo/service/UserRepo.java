package com.club.repo.service;

import com.club.model.AccountStatus;
import com.club.model.AppUser;
import com.club.model.Role;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface UserRepo extends JpaRepository<AppUser, Long> {
        Optional<AppUser> findByEmail(String email);
        Optional<AppUser> findByUsername(String username);
        Optional<AppUser> findByUsernameOrEmail(String username, String email);
        boolean existsByEmail(String email);
        boolean existsByUsername(String username);
        List<AppUser> findByRoleAndStatusOrderBySurnameAscNameAsc(Role role, AccountStatus status);
        List<AppUser> findByStatusOrderBySurnameAscNameAsc(AccountStatus status);
}
