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
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;

import java.time.*;
import java.time.format.DateTimeFormatter;
import java.time.format.DateTimeFormatterBuilder;
import java.util.ArrayList;
import java.util.List;

@Service
public class AirQualityService {

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

    /** ALWAYS: fetch from Open-Meteo -> upsert -> return fetched points (not DB). */
    public AirQualitySeriesDto live(String locationId, Instant from, Instant to) {
        Location loc = locations.findById(locationId)
                .orElseThrow(() -> new IllegalArgumentException("Location not found: " + locationId));

        List<AirQualityPointDto> fetched = fetchFromOpenMeteo(latOf(loc), lonOf(loc), from, to);

        // persist for history, but do not re-read from DB
        if (!fetched.isEmpty()) {
            upsertBatch(locationId, fetched);
        }

        AirQualityAveragesDto averages = computeAverages(fetched);
        return new AirQualitySeriesDto(averages, fetched);
    }

    /** Optional: read-only DB history (kept for diagnostics/tools/UIs). */
    public List<AirQualityPointDto> history(String locationId, Instant from, Instant to) {
        Query q = new Query(Criteria.where("locationId").is(locationId)
                .and("recordedAt").gte(from).lte(to));
        q.with(Sort.by(Sort.Direction.ASC, "recordedAt"));

        var docs = mongo.find(q, AirQualityMeasurement.class);
        List<AirQualityPointDto> out = new ArrayList<>(docs.size());
        for (var e : docs) out.add(mapper.toDto(e));
        return out;
    }

    /** Fetch hourly AQ series from Open-Meteo. */
    public List<AirQualityPointDto> fetchFromOpenMeteo(double lat, double lon, Instant from, Instant to) {
        String url = buildUrl(lat, lon, from, to);
        String body = http.get().uri(url).retrieve().body(String.class);

        try {
            JsonNode hourly = om.readTree(body).path("hourly");

            List<String> times   = toStrList(hourly.path("time"));
            List<Double> pm10    = toDblList(hourly.path("pm10"));
            List<Double> pm25    = toDblList(hourly.path("pm2_5"));
            List<Double> co      = toDblList(hourly.path("carbon_monoxide"));
            List<Double> co2     = toDblList(hourly.path("carbon_dioxide"));
            List<Double> no2     = toDblList(hourly.path("nitrogen_dioxide"));
            List<Double> so2     = toDblList(hourly.path("sulphur_dioxide"));
            List<Double> o3      = toDblList(hourly.path("ozone"));
            List<Double> uv      = toDblList(hourly.path("uv_index"));
            List<Double> ch4     = toDblList(hourly.path("methane"));

            int n = times.size();
            List<AirQualityPointDto> out = new ArrayList<>(n);
            for (int i = 0; i < n; i++) {
                Instant t = parseUtcInstant(times.get(i));
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

    /** Bulk UPSERT by (locationId, recordedAt). */
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

    /** Averages (null-safe), rounded to 1 decimal. */
    public AirQualityAveragesDto computeAverages(List<AirQualityPointDto> pts) {
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

    // ---------- helpers ----------

    private static String buildUrl(double lat, double lon, Instant from, Instant to) {
        DateTimeFormatter ISO = DateTimeFormatter.ISO_OFFSET_DATE_TIME.withZone(ZoneOffset.UTC);
        return "https://air-quality-api.open-meteo.com/v1/air-quality"
                + "?latitude=" + lat
                + "&longitude=" + lon
                + "&hourly=pm10,pm2_5,carbon_monoxide,carbon_dioxide,"
                + "nitrogen_dioxide,sulphur_dioxide,ozone,uv_index,methane"
                + "&timezone=UTC"
                + "&start=" + ISO.format(from)
                + "&end="   + ISO.format(to);
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
        if (list == null || i >= list.size()) return null;
        Double v = list.get(i);
        return (v == null || v.isNaN() || v.isInfinite()) ? null : v;
    }

    // Open-Meteo time format: yyyy-MM-dd'T'HH:mm[[:ss]['Z']]
    private static final DateTimeFormatter OM_HOURLY =
            new DateTimeFormatterBuilder()
                    .appendPattern("yyyy-MM-dd'T'HH:mm")
                    .optionalStart().appendPattern(":ss").optionalEnd()
                    .optionalStart().appendLiteral('Z').optionalEnd()
                    .toFormatter();

    private static Instant parseUtcInstant(String s) {
        return LocalDateTime.parse(s, OM_HOURLY).toInstant(ZoneOffset.UTC);
    }

    private static Double avg(List<Double> values) {
        if (values == null || values.isEmpty()) return null;
        double sum = 0; int n = 0;
        for (Double v : values) {
            if (v != null && !v.isNaN() && !v.isInfinite()) { sum += v; n++; }
        }
        return n == 0 ? null : Math.round((sum / n) * 10.0) / 10.0;
    }

    private static double latOf(Location loc) {
        try { return (double) Location.class.getMethod("getLatitude").invoke(loc); }
        catch (Exception ignore) { }
        try { return (double) Location.class.getMethod("getLat").invoke(loc); }
        catch (Exception e) { throw new IllegalStateException("Location must expose getLatitude() or getLat()"); }
    }

    private static double lonOf(Location loc) {
        try { return (double) Location.class.getMethod("getLongitude").invoke(loc); }
        catch (Exception ignore) { }
        try { return (double) Location.class.getMethod("getLon").invoke(loc); }
        catch (Exception e) { throw new IllegalStateException("Location must expose getLongitude() or getLon()"); }
    }
}
