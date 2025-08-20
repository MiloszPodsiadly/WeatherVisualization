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
import java.time.format.DateTimeFormatter;
import java.time.format.DateTimeFormatterBuilder;
import java.time.temporal.ChronoField;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.List;
import java.util.TreeMap;

@Service
public class WeatherService {
    private static final String SOURCE = "OPEN_METEO";

    private static final DateTimeFormatter OM_TIME = new DateTimeFormatterBuilder()
            .append(DateTimeFormatter.ISO_LOCAL_DATE)
            .appendLiteral('T')
            .appendPattern("HH:mm")
            .optionalStart().appendLiteral(':').appendPattern("ss").optionalEnd()
            .optionalStart().appendOffset("+HH:MM", "Z").optionalEnd()
            .toFormatter();

    private static Instant parseOmTime(String s) {
        var ta = OM_TIME.parse(s);
        return ta.isSupported(ChronoField.OFFSET_SECONDS)
                ? OffsetDateTime.from(ta).toInstant()
                : LocalDateTime.from(ta).toInstant(ZoneOffset.UTC);
    }

    private final RestClient http;
    private final ObjectMapper om = new ObjectMapper();
    private final WeatherMeasurementRepository repo;
    private final WeatherMeasurementMapper measMapper;
    private final LocationMapper locationMapper;

    public WeatherService(RestClient http,
                          WeatherMeasurementRepository repo,
                          WeatherMeasurementMapper measMapper,
                          LocationMapper locationMapper) {
        this.http = http;
        this.repo = repo;
        this.measMapper = measMapper;
        this.locationMapper = locationMapper;
    }

    public WeatherCurrentDto current(Location loc) {
        String url = "https://api.open-meteo.com/v1/forecast?"
                + "latitude=" + loc.getLatitude()
                + "&longitude=" + loc.getLongitude()
                + "&current=temperature_2m,relative_humidity_2m,pressure_msl,wind_speed_10m,wind_direction_10m,precipitation,cloud_cover"
                + "&hourly=precipitation,cloud_cover"
                + "&past_hours=1&forecast_hours=0"
                + "&timezone=UTC";

        String body = http.get().uri(url).retrieve().body(String.class);
        try {
            JsonNode root = om.readTree(body);
            JsonNode cur = root.path("current");
            Instant ts = parseOmTime(cur.path("time").asText());

            Double precipitation = nodeD(cur, "precipitation");
            Double cloudCover    = nodeD(cur, "cloud_cover");

            if (precipitation == null || cloudCover == null) {
                JsonNode hourly = root.path("hourly");
                Instant hourKey = ts.truncatedTo(ChronoUnit.HOURS);
                if (precipitation == null) {
                    precipitation = valueAtHour(hourly, "precipitation", hourKey);
                }
                if (cloudCover == null) {
                    cloudCover = valueAtHour(hourly, "cloud_cover", hourKey);
                }
            }

            var p = new WeatherPointDto(
                    ts,
                    nodeD(cur, "temperature_2m"),
                    nodeD(cur, "relative_humidity_2m"),
                    nodeD(cur, "pressure_msl"),
                    nodeD(cur, "wind_speed_10m"),
                    nodeD(cur, "wind_direction_10m"),
                    precipitation,
                    cloudCover
            );

            repo.save(measMapper.toDoc(p, loc.getId(), SOURCE));
            return new WeatherCurrentDto(locationMapper.toDto(loc), p, SOURCE);
        } catch (Exception e) {
            throw new RuntimeException("Cannot parse current weather", e);
        }
    }

    public WeatherHistoryResponseDto history(Location loc, Instant from, Instant to, String interval) {
        LocalDate start = LocalDateTime.ofInstant(from, ZoneOffset.UTC).toLocalDate();
        LocalDate end   = LocalDateTime.ofInstant(to,   ZoneOffset.UTC).toLocalDate();

        String url = "https://api.open-meteo.com/v1/forecast?"
                + "latitude=" + loc.getLatitude()
                + "&longitude=" + loc.getLongitude()
                + "&hourly=temperature_2m,relative_humidity_2m,pressure_msl,"
                + "wind_speed_10m,wind_direction_10m,"
                + "precipitation,cloud_cover,"
                + "rain,showers,precipitation_probability"
                + "&start_date=" + start
                + "&end_date=" + end
                + "&timezone=UTC";

        List<WeatherPointDto> apiPoints = new ArrayList<>();
        try {
            String body = http.get().uri(url).retrieve().body(String.class);
            JsonNode h  = om.readTree(body).path("hourly");
            var times = h.path("time");
            var t2m   = h.path("temperature_2m");
            var rh    = h.path("relative_humidity_2m");
            var pmsl  = h.path("pressure_msl");
            var ws    = h.path("wind_speed_10m");
            var wd    = h.path("wind_direction_10m");
            var pr    = h.path("precipitation");
            var cc    = h.path("cloud_cover");
            var rain  = h.path("rain");
            var sh    = h.path("showers");

            for (int i = 0; i < times.size(); i++) {
                Instant ts = parseOmTime(times.get(i).asText());
                if (ts.isBefore(from) || ts.isAfter(to)) continue;

                Double precip = nodeD(pr, i);
                if (precip == null || precip.doubleValue() == 0.0d) {
                    Double rv = nodeD(rain, i);
                    Double sv = nodeD(sh, i);
                    double sum = (rv == null ? 0 : rv) + (sv == null ? 0 : sv);
                    if (precip == null || sum > 0) precip = sum;
                }

                var p = new WeatherPointDto(
                        ts,
                        nodeD(t2m, i),
                        nodeD(rh, i),
                        nodeD(pmsl, i),
                        nodeD(ws, i),
                        nodeD(wd, i),
                        precip,
                        nodeD(cc, i)
                );
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

    private static Double valueAtHour(JsonNode hourly, String field, Instant hourKey) {
        var times = hourly.path("time");
        var vals  = hourly.path(field);
        if (!times.isArray() || !vals.isArray()) return null;
        for (int i = 0; i < times.size(); i++) {
            Instant t = parseOmTime(times.get(i).asText()).truncatedTo(ChronoUnit.HOURS);
            if (t.equals(hourKey)) {
                return nodeD(vals, i);
            }
        }
        return null;
    }

    private static Double nodeD(JsonNode obj, String field) {
        return obj.path(field).isMissingNode() ? null : obj.path(field).asDouble();
    }
    private static Double nodeD(JsonNode arr, int i) {
        return (arr.isMissingNode() || arr.get(i) == null || arr.get(i).isNull()) ? null : arr.get(i).asDouble();
    }
}