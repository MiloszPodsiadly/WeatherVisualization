package com.milosz.podsiadly.backend.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.milosz.podsiadly.backend.dto.AirQualityAveragesDto;
import com.milosz.podsiadly.backend.dto.AirQualityPointDto;
import com.milosz.podsiadly.backend.dto.AirQualitySeriesDto;
import com.milosz.podsiadly.backend.entity.AirQualityMeasurement;
import com.milosz.podsiadly.backend.entity.Location;
import com.milosz.podsiadly.backend.mapper.AirQualityMapper;
import com.milosz.podsiadly.backend.repository.LocationRepository;
import org.springframework.data.domain.Sort;
import org.springframework.data.mongodb.core.BulkOperations;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.query.Criteria;
import org.springframework.data.mongodb.core.query.Query;
import org.springframework.data.mongodb.core.query.Update;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.*;
import java.time.format.DateTimeFormatter;
import java.time.format.DateTimeFormatterBuilder;
import java.time.temporal.ChronoUnit;
import java.util.*;
import java.util.stream.Collectors;

import static java.time.format.DateTimeFormatter.RFC_1123_DATE_TIME;

@Service
public class AirQualityService {

    private static final String API_BASE =
            "https://air-quality-api.open-meteo.com/v1/air-quality";

    private static final String HOURLY_PARAMS =
            "pm10,pm2_5,carbon_monoxide,carbon_dioxide," +
                    "nitrogen_dioxide,sulphur_dioxide,ozone,uv_index,methane";

    private static final DateTimeFormatter ISO_UTC =
            DateTimeFormatter.ISO_OFFSET_DATE_TIME.withZone(ZoneOffset.UTC);

    private static final DateTimeFormatter OM_HOURLY =
            new DateTimeFormatterBuilder()
                    .appendPattern("yyyy-MM-dd'T'HH:mm")
                    .optionalStart().appendPattern(":ss").optionalEnd()
                    .optionalStart().appendLiteral('Z').optionalEnd()
                    .toFormatter();

    private final RestClient http;
    private final MongoTemplate mongo;
    private final LocationRepository locations;
    private final AirQualityMapper mapper;
    private final ObjectMapper om = new ObjectMapper();

    public AirQualityService(RestClient http,
                             MongoTemplate mongo,
                             LocationRepository locations,
                             AirQualityMapper mapper) {
        this.http = http;
        this.mongo = mongo;
        this.locations = locations;
        this.mapper = mapper;
    }

    public AirQualitySeriesDto live(String locationId, Instant from, Instant to) {
        requireValidWindow(from, to);

        Location loc = locations.findById(locationId)
                .orElseThrow(() -> new IllegalArgumentException("Location not found: " + locationId));

        List<AirQualityPointDto> fetched = fetchFromOpenMeteo(latOf(loc), lonOf(loc), from, to);
        if (!fetched.isEmpty()) upsertBatch(locationId, fetched);

        List<AirQualityPointDto> dbPoints = history(locationId, from, to);
        Map<Instant, AirQualityPointDto> byTime = new java.util.HashMap<>();
        for (var p : dbPoints) byTime.put(p.time(), p);
        for (var p : fetched)  byTime.put(p.time(), p);

        if (byTime.isEmpty()) {
            return new AirQualitySeriesDto(new AirQualityAveragesDto(null,null,null,null,null,null,null,null,null), List.of());
        }

        Instant latest = byTime.keySet().stream().max(Instant::compareTo).get()
                .truncatedTo(java.time.temporal.ChronoUnit.HOURS);
        Instant start  = latest.minus(23, java.time.temporal.ChronoUnit.HOURS);

        java.util.List<AirQualityPointDto> series = new java.util.ArrayList<>(24);
        for (Instant t = start; !t.isAfter(latest); t = t.plus(1, java.time.temporal.ChronoUnit.HOURS)) {
            AirQualityPointDto p = byTime.get(t);
            series.add(p != null ? p
                    : new AirQualityPointDto(t, null,null,null,null,null,null,null,null,null));
        }

        AirQualityAveragesDto averages = computeAverages(series);
        return new AirQualitySeriesDto(averages, series);
    }

    public List<AirQualityPointDto> history(String locationId, Instant from, Instant to) {
        if (!isValidWindow(from, to)) return List.of();

        Query q = new Query(Criteria.where("locationId").is(locationId)
                .and("recordedAt").gte(from).lte(to));
        q.with(Sort.by(Sort.Direction.ASC, "recordedAt"));

        var docs = mongo.find(q, AirQualityMeasurement.class);
        return docs.stream().map(mapper::toDto).collect(Collectors.toList());
    }

    public List<AirQualityPointDto> fetchFromOpenMeteo(double lat, double lon, Instant from, Instant to) {
        Instant start = from.truncatedTo(ChronoUnit.MINUTES);
        Instant end   = to.truncatedTo(ChronoUnit.MINUTES);

        String url = buildUrl(lat, lon, start, end);

        ResponseEntity<String> resp = http.get().uri(url).retrieve().toEntity(String.class);
        String body = Objects.requireNonNullElse(resp.getBody(), "{}");

        Instant apiNow = null;
        try {
            String dateHeader = resp.getHeaders().getFirst("Date");
            if (dateHeader != null) apiNow = ZonedDateTime.parse(dateHeader, RFC_1123_DATE_TIME).toInstant();
        } catch (Exception ignored) { /* safe to ignore; frontend clamps too */ }

        try {
            JsonNode hourly = om.readTree(body).path("hourly");

            List<String> times = toStrList(hourly.path("time"));
            List<Double> pm10  = toDblList(hourly.path("pm10"));
            List<Double> pm25  = toDblList(hourly.path("pm2_5"));
            List<Double> co    = toDblList(hourly.path("carbon_monoxide"));
            List<Double> co2   = toDblList(hourly.path("carbon_dioxide"));
            List<Double> no2   = toDblList(hourly.path("nitrogen_dioxide"));
            List<Double> so2   = toDblList(hourly.path("sulphur_dioxide"));
            List<Double> o3    = toDblList(hourly.path("ozone"));
            List<Double> uv    = toDblList(hourly.path("uv_index"));
            List<Double> ch4   = toDblList(hourly.path("methane"));

            int n = times.size();
            List<AirQualityPointDto> out = new ArrayList<>(n);

            for (int i = 0; i < n; i++) {
                Instant t = parseUtcInstant(times.get(i));
                if (t.isBefore(start) || t.isAfter(end)) continue;
                if (apiNow != null && t.isAfter(apiNow)) continue;

                out.add(new AirQualityPointDto(
                        t,
                        pick(pm10, i), pick(pm25, i),
                        pick(co, i),  pick(co2, i),
                        pick(no2, i), pick(so2, i),
                        pick(o3, i),  pick(ch4, i),
                        pick(uv, i)
                ));
            }
            return out;
        } catch (Exception e) {
            throw new RuntimeException("Cannot parse Open-Meteo air-quality response", e);
        }
    }

    public int upsertBatch(String locationId, List<AirQualityPointDto> points) {
        if (points == null || points.isEmpty()) return 0;

        BulkOperations bulk = mongo.bulkOps(BulkOperations.BulkMode.UNORDERED, AirQualityMeasurement.class);

        for (AirQualityPointDto d : points) {
            Query q = new Query(Criteria.where("locationId").is(locationId)
                    .and("recordedAt").is(d.time()));

            Update u = new Update()
                    .setOnInsert("locationId", locationId)
                    .set("recordedAt", d.time())
                    .set("pm10", d.pm10())
                    .set("pm25", d.pm25())
                    .set("co", d.co())
                    .set("co2", d.co2())
                    .set("no2", d.no2())
                    .set("so2", d.so2())
                    .set("o3", d.o3())
                    .set("ch4", d.ch4())
                    .set("uv", d.uv());

            bulk.upsert(q, u);
        }

        bulk.execute();
        return points.size();
    }

    public AirQualityAveragesDto computeAverages(List<AirQualityPointDto> pts) {
        if (pts == null) pts = List.of();
        return new AirQualityAveragesDto(
                avg(pts.stream().map(AirQualityPointDto::pm10).toList()),
                avg(pts.stream().map(AirQualityPointDto::pm25).toList()),
                avg(pts.stream().map(AirQualityPointDto::co).toList()),
                avg(pts.stream().map(AirQualityPointDto::co2).toList()),
                avg(pts.stream().map(AirQualityPointDto::no2).toList()),
                avg(pts.stream().map(AirQualityPointDto::so2).toList()),
                avg(pts.stream().map(AirQualityPointDto::o3).toList()),
                avg(pts.stream().map(AirQualityPointDto::ch4).toList()),
                avg(pts.stream().map(AirQualityPointDto::uv).toList())
        );
    }

    private static void requireValidWindow(Instant from, Instant to) {
        if (!isValidWindow(from, to)) {
            throw new IllegalArgumentException("Invalid time window");
        }
    }

    private static boolean isValidWindow(Instant from, Instant to) {
        return from != null && to != null && from.isBefore(to);
    }

    private static String buildUrl(double lat, double lon, Instant from, Instant to) {
        int pastDays = 0;
        LocalDate dFrom = ZonedDateTime.ofInstant(from, ZoneOffset.UTC).toLocalDate();
        LocalDate dTo   = ZonedDateTime.ofInstant(to,   ZoneOffset.UTC).toLocalDate();
        if (dFrom.isBefore(dTo)) pastDays = 2;

        StringBuilder sb = new StringBuilder(API_BASE)
                .append("?latitude=").append(lat)
                .append("&longitude=").append(lon)
                .append("&hourly=").append(HOURLY_PARAMS)
                .append("&timezone=UTC")
                .append("&start=").append(ISO_UTC.format(from))
                .append("&end=").append(ISO_UTC.format(to));

        if (pastDays > 0) sb.append("&past_days=").append(pastDays);
        return sb.toString();
    }

    private static List<String> toStrList(JsonNode arr) {
        if (arr == null || !arr.isArray()) return List.of();
        List<String> out = new ArrayList<>(arr.size());
        arr.forEach(n -> out.add(n.asText()));
        return out;
    }

    private static List<Double> toDblList(JsonNode arr) {
        if (arr == null || !arr.isArray()) return List.of();
        List<Double> out = new ArrayList<>(arr.size());
        arr.forEach(n -> out.add(n.isNull() ? null : n.asDouble()));
        return out;
    }

    private static Double pick(List<Double> list, int i) {
        if (list == null || i < 0 || i >= list.size()) return null;
        Double v = list.get(i);
        return (v == null || v.isNaN() || v.isInfinite()) ? null : v;
    }

    private static Instant parseUtcInstant(String s) {
        return LocalDateTime.parse(s, OM_HOURLY).toInstant(ZoneOffset.UTC);
    }

    private static Double avg(List<Double> values) {
        if (values == null || values.isEmpty()) return null;
        double sum = 0; int n = 0;
        for (Double v : values) {
            if (v != null && !v.isNaN() && !v.isInfinite()) { sum += v; n++; }
        }
        if (n == 0) return null;
        return new BigDecimal(sum / n).setScale(1, RoundingMode.HALF_UP).doubleValue();
    }

    private static double latOf(Location loc) {
        try { return (double) Location.class.getMethod("getLatitude").invoke(loc); }
        catch (Exception ignore) { /* fallthrough */ }
        try { return (double) Location.class.getMethod("getLat").invoke(loc); }
        catch (Exception e) { throw new IllegalStateException("Location must expose getLatitude() or getLat()"); }
    }

    private static double lonOf(Location loc) {
        try { return (double) Location.class.getMethod("getLongitude").invoke(loc); }
        catch (Exception ignore) { /* fallthrough */ }
        try { return (double) Location.class.getMethod("getLon").invoke(loc); }
        catch (Exception e) { throw new IllegalStateException("Location must expose getLongitude() or getLon()"); }
    }

    private static List<AirQualityPointDto> buildContinuousHourlySeries(
            Map<Instant, AirQualityPointDto> byTime, Instant from, Instant to) {

        List<AirQualityPointDto> out = new ArrayList<>();
        Instant startH = from.truncatedTo(ChronoUnit.HOURS);
        Instant endH   = to.truncatedTo(ChronoUnit.HOURS);

        for (Instant t = startH; !t.isAfter(endH); t = t.plus(1, ChronoUnit.HOURS)) {
            AirQualityPointDto p = byTime.get(t);
            if (p != null) {
                out.add(p);
            } else {
                out.add(new AirQualityPointDto(
                        t, null, null, null, null, null, null, null, null, null
                ));
            }
        }
        return out;
    }
}
