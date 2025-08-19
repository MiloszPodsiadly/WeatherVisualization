package com.milosz.podsiadly.backend.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.milosz.podsiadly.backend.dto.*;
import com.milosz.podsiadly.backend.entity.Location;
import com.milosz.podsiadly.backend.mapper.LocationMapper;
import com.milosz.podsiadly.backend.mapper.WeatherMeasurementMapper;
import com.milosz.podsiadly.backend.repository.WeatherMeasurementRepository;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;

import java.time.*;
import java.util.ArrayList;
import java.util.List;
import java.util.TreeMap;

@Service
public class WeatherService {
    private static final String SOURCE = "OPEN_METEO";
    private final RestClient http;
    private final ObjectMapper om = new ObjectMapper();
    private final WeatherMeasurementRepository repo;
    private final WeatherMeasurementMapper measMapper;
    private final LocationMapper locationMapper;

    public WeatherService(RestClient http,
                          WeatherMeasurementRepository repo,
                          WeatherMeasurementMapper measMapper,
                          LocationMapper locationMapper) {
        this.http = http; this.repo = repo; this.measMapper = measMapper; this.locationMapper = locationMapper;
    }

    public WeatherCurrentDto current(Location loc) {
        String url = "https://api.open-meteo.com/v1/forecast?"
                + "latitude=" + loc.getLatitude()
                + "&longitude=" + loc.getLongitude()
                + "&current=temperature_2m,relative_humidity_2m,pressure_msl,wind_speed_10m,wind_direction_10m,precipitation,cloud_cover"
                + "&timezone=UTC";
        String body = http.get().uri(url).retrieve().body(String.class);
        try {
            JsonNode cur = om.readTree(body).path("current");
            var p = new WeatherPointDto(
                    Instant.parse(cur.path("time").asText() + "Z"),
                    nodeD(cur, "temperature_2m"),
                    nodeD(cur, "relative_humidity_2m"),
                    nodeD(cur, "pressure_msl"),
                    nodeD(cur, "wind_speed_10m"),
                    nodeD(cur, "wind_direction_10m"),
                    nodeD(cur, "precipitation"),
                    nodeD(cur, "cloud_cover")
            );
            repo.save(measMapper.toDoc(p, loc.getId(), SOURCE));
            return new WeatherCurrentDto(locationMapper.toDto(loc), p, SOURCE);
        } catch (Exception e) {
            throw new RuntimeException("Cannot parse current weather", e);
        }
    }

    public WeatherHistoryResponseDto history(Location loc, Instant from, Instant to, String interval) {
        LocalDate start = LocalDateTime.ofInstant(from, ZoneOffset.UTC).toLocalDate();
        LocalDate end   = LocalDateTime.ofInstant(to, ZoneOffset.UTC).toLocalDate();
        String url = "https://api.open-meteo.com/v1/forecast?"
                + "latitude=" + loc.getLatitude()
                + "&longitude=" + loc.getLongitude()
                + "&hourly=temperature_2m,relative_humidity_2m,pressure_msl,wind_speed_10m,wind_direction_10m,precipitation,cloud_cover"
                + "&start_date=" + start
                + "&end_date=" + end
                + "&timezone=UTC";

        List<WeatherPointDto> apiPoints = new ArrayList<>();
        try {
            String body = http.get().uri(url).retrieve().body(String.class);
            JsonNode h = om.readTree(body).path("hourly");
            var times = h.path("time");
            var t2m   = h.path("temperature_2m");
            var rh    = h.path("relative_humidity_2m");
            var pmsl  = h.path("pressure_msl");
            var ws    = h.path("wind_speed_10m");
            var wd    = h.path("wind_direction_10m");
            var pr    = h.path("precipitation");
            var cc    = h.path("cloud_cover");

            for (int i=0; i<times.size(); i++) {
                Instant ts = Instant.parse(times.get(i).asText() + "Z");
                if (ts.isBefore(from) || ts.isAfter(to)) continue;
                var p = new WeatherPointDto(ts, nodeD(t2m, i), nodeD(rh, i), nodeD(pmsl, i),
                        nodeD(ws, i), nodeD(wd, i), nodeD(pr, i), nodeD(cc, i));
                apiPoints.add(p);
            }
            repo.saveAll(apiPoints.stream().map(p -> measMapper.toDoc(p, loc.getId(), SOURCE)).toList());
        } catch (Exception ignored) {}

        var dbPoints = repo.findByLocationIdAndRecordedAtBetweenOrderByRecordedAt(loc.getId(), from, to)
                .stream().map(measMapper::toDto).toList();

        var merged = new TreeMap<Instant, WeatherPointDto>();
        dbPoints.forEach(p -> merged.put(p.recordedAt(), p));
        apiPoints.forEach(p -> merged.put(p.recordedAt(), p));

        return new WeatherHistoryResponseDto(locationMapper.toDto(loc), interval, new ArrayList<>(merged.values()), SOURCE);
    }

    private static Double nodeD(JsonNode obj, String field) {
        return obj.path(field).isMissingNode() ? null : obj.path(field).asDouble();
    }
    private static Double nodeD(JsonNode arr, int i) {
        return (arr.isMissingNode() || arr.get(i)==null || arr.get(i).isNull()) ? null : arr.get(i).asDouble();
    }
}