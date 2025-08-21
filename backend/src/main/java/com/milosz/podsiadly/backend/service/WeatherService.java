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
import java.util.*;

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

    private static final ZoneId UTC = ZoneOffset.UTC;
    private static final int FORECAST_RECENT_DAYS = 7;

    private static final String HOURLY_FIELDS = String.join(",",
            "temperature_2m",
            "relative_humidity_2m",
            "pressure_msl",
            "wind_speed_10m",
            "wind_direction_10m",
            "precipitation",
            "cloud_cover",
            "rain",
            "showers"
    );

    private static LocalDate recentCutoffDateUtc() {
        return LocalDate.now(UTC).minusDays(FORECAST_RECENT_DAYS);
    }

    private record OmChunk(LocalDate start, LocalDate end, boolean archive) {}

    private List<OmChunk> planChunks(Instant from, Instant to) {
        LocalDate s = LocalDateTime.ofInstant(from, UTC).toLocalDate();
        LocalDate e = LocalDateTime.ofInstant(to,   UTC).toLocalDate();
        if (e.isBefore(s)) { var tmp = s; s = e; e = tmp; }
        LocalDate cut = recentCutoffDateUtc();

        if (e.isBefore(cut)) {
            return List.of(new OmChunk(s, e, true));
        }
        if (!s.isBefore(cut)) {
            return List.of(new OmChunk(s, e, false));
        }
        return List.of(
                new OmChunk(s, cut.minusDays(1), true),
                new OmChunk(cut, e, false)
        );
    }

    private String buildUrl(boolean archive, Location loc, LocalDate start, LocalDate end) {
        String base = archive
                ? "https://archive-api.open-meteo.com/v1/archive"
                : "https://api.open-meteo.com/v1/forecast";
        return base + "?"
                + "latitude=" + loc.getLatitude()
                + "&longitude=" + loc.getLongitude()
                + "&hourly=" + HOURLY_FIELDS
                + "&start_date=" + start
                + "&end_date=" + end
                + "&timezone=UTC";
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
                if (precipitation == null) precipitation = valueAtHour(hourly, "precipitation", hourKey);
                if (cloudCover == null)    cloudCover    = valueAtHour(hourly, "cloud_cover", hourKey);
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
        var chunks = planChunks(from, to);

        List<WeatherPointDto> apiPoints = new ArrayList<>();
        for (var ch : chunks) {
            String url = buildUrl(ch.archive(), loc, ch.start(), ch.end());
            try {
                String body = http.get().uri(url).retrieve().body(String.class);
                apiPoints.addAll(parseHourlyBlock(body, from, to));
            } catch (Exception ignored) { }
        }

        if (!apiPoints.isEmpty()) {
            repo.saveAll(apiPoints.stream().map(p -> measMapper.toDoc(p, loc.getId(), SOURCE)).toList());
        }

        var dbPoints = repo.findByLocationIdAndRecordedAtBetweenOrderByRecordedAt(loc.getId(), from, to)
                .stream().map(measMapper::toDto).toList();

        var merged = new TreeMap<Instant, WeatherPointDto>();
        dbPoints.forEach(p -> merged.put(p.recordedAt(), p));
        apiPoints.forEach(p -> merged.put(p.recordedAt(), p));

        var step = parseInterval(interval);
        var aggregated = aggregateToInterval(new ArrayList<>(merged.values()), step);

        return new WeatherHistoryResponseDto(locationMapper.toDto(loc), interval, aggregated, SOURCE);
    }

    private List<WeatherPointDto> parseHourlyBlock(String body, Instant from, Instant to) throws Exception {
        List<WeatherPointDto> out = new ArrayList<>();
        JsonNode h  = om.readTree(body).path("hourly");
        var times = h.path("time");
        if (!times.isArray()) return out;

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
            if (precip == null) {
                Double rv = nodeD(rain, i);
                Double sv = nodeD(sh, i);
                precip = (rv == null ? 0 : rv) + (sv == null ? 0 : sv);
            }

            out.add(new WeatherPointDto(
                    ts,
                    nodeD(t2m, i),
                    nodeD(rh, i),
                    nodeD(pmsl, i),
                    nodeD(ws, i),
                    nodeD(wd, i),
                    precip,
                    nodeD(cc, i)
            ));
        }
        return out;
    }

    private static Duration parseInterval(String interval) {
        return switch (interval) {
            case "1h" -> Duration.ofHours(1);
            case "3h" -> Duration.ofHours(3);
            case "6h" -> Duration.ofHours(6);
            case "12h" -> Duration.ofHours(12);
            case "1d", "24h" -> Duration.ofDays(1);
            default -> Duration.ofHours(1);
        };
    }

    private static double nz(Double v) { return v == null ? 0.0 : v; }

    private static List<WeatherPointDto> aggregateToInterval(List<WeatherPointDto> points, Duration step) {
        long stepSec = step.getSeconds();
        record Acc(double t,double h,double p,double ws,double wd,double pr,double cc,int n){}
        var map = new TreeMap<Instant, Acc>();

        for (var p : points) {
            long bucket = Math.floorDiv(p.recordedAt().getEpochSecond(), stepSec) * stepSec;
            Instant key = Instant.ofEpochSecond(bucket);
            var a = map.getOrDefault(key, new Acc(0,0,0,0,0,0,0,0));
            a = new Acc(
                    a.t  + nz(p.temperature()),
                    a.h  + nz(p.humidity()),
                    a.p  + nz(p.pressure()),
                    a.ws + nz(p.windSpeed()),
                    a.wd + nz(p.windDirection()),
                    a.pr + nz(p.precipitation()),
                    a.cc + nz(p.cloudCover()),
                    a.n  + 1
            );
            map.put(key, a);
        }

        var out = new ArrayList<WeatherPointDto>(map.size());
        for (var e : map.entrySet()) {
            var k = e.getKey(); var a = e.getValue(); int n = Math.max(a.n(), 1);
            out.add(new WeatherPointDto(
                    k,
                    a.t()/n,
                    a.h()/n,
                    a.p()/n,
                    a.ws()/n,
                    a.wd()/n,
                    a.pr(),
                    a.cc()/n
            ));
        }
        return out;
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
