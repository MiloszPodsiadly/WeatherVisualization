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
    private String id;            // Mongo ID (ObjectId jako String)

    @Indexed
    private String name;          // "Warszawa"

    private String admin;         // "Mazowieckie" (opcjonalne)

    @Indexed
    private String country;       // "PL"

    private Double latitude;      // 52.2297
    private Double longitude;     // 21.0122
}
