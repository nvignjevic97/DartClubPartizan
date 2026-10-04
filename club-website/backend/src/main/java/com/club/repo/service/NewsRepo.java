package com.club.repo.service;

import com.club.model.News;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface NewsRepo extends JpaRepository<News, Long> { List<News> findAllByOrderByCreatedAtDesc(); }

