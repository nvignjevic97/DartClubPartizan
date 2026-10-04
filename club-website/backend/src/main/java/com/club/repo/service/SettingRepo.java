package com.club.repo.service;

import com.club.model.SiteSetting;
import org.springframework.data.jpa.repository.JpaRepository;

public interface SettingRepo extends JpaRepository<SiteSetting, String> {}

