package com.club.model;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

@Entity @Getter @Setter
public class SiteSetting {
    @Id @Column(name = "setting_key") private String key;
    @Column(name = "setting_value", columnDefinition = "text") private String value;
    public SiteSetting() {}
    public SiteSetting(String key, String value) { this.key = key; this.value = value; }
}
