package com.milosz.podsiadly.backend.entity;

import lombok.*;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;
import org.springframework.data.mongodb.core.index.Indexed;

@Document(collection = "locations")
@Getter @Setter
@NoArgsConstructor @AllArgsConstructor @Builder
public class Location {

    @Id
    private String id;

    @Indexed
    private String name;

    private String admin;

    @Indexed
    private String country;

    private Double latitude;
    private Double longitude;
}
