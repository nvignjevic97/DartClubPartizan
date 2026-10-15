package com.club.repo.service;

import com.club.model.GalleryItem;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface GalleryItemRepo extends JpaRepository<GalleryItem, Long> {
    List<GalleryItem> findAllByOrderBySortOrderAsc();
    List<GalleryItem> findAllByTypeOrderBySortOrderAsc(String type);
}
