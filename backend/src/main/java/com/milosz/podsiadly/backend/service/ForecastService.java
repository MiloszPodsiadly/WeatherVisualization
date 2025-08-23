package com.milosz.podsiadly.backend.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.milosz.podsiadly.backend.dto.CitySnapshotDto;
import com.milosz.podsiadly.backend.dto.DailySeriesDto;
import com.milosz.podsiadly.backend.dto.PlSnapshotResponseDto;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;

import java.time.Instant;
import java.util.*;

@Service
public class ForecastService {

    private final RestClient http;
    private final ObjectMapper om = new ObjectMapper();

    public ForecastService(RestClient http) {
        this.http = http;
    }

    public DailySeriesDto daily(double lat, double lon, int days) {
        int d = Math.max(1, Math.min(days, 16));
        String url = "https://api.open-meteo.com/v1/forecast"
                + "?latitude=" + lat
                + "&longitude=" + lon
                + "&forecast_days=" + d
                + "&daily=temperature_2m_max,precipitation_probability_max"
                + "&timezone=UTC";

        String body = http.get().uri(url).retrieve().body(String.class);
        try {
            JsonNode root = om.readTree(body).path("daily");
            List<String> dates = toStrList(root.path("time"));
            List<Double> tmax = toDblList(root.path("temperature_2m_max"));
            List<Integer> pop = toIntList(root.path("precipitation_probability_max"));
            return new DailySeriesDto(dates, tmax, pop);
        } catch (Exception e) {
            throw new RuntimeException("Cannot parse Open-Meteo daily", e);
        }
    }

    public PlSnapshotResponseDto polandSnapshot(String range) {
        Range r = Range.from(range);

        List<City> cities = City.ALL;
        List<CitySnapshotDto> out = new ArrayList<>(cities.size());

        for (City c : cities) {
            DailySeriesDto s = daily(c.lat, c.lon, 7);
            Double t = null;
            Integer p = null;

            if (!s.dates().isEmpty()) {
                switch (r) {
                    case TODAY, TOMORROW, PLUS2 -> {
                        int idx = Math.min(r.offset, s.dates().size() - 1);
                        t = pickDouble(s.tmax(), idx);
                        p = pickInt(s.pop(), idx);
                    }
                    case WEEK -> {
                        t = avg(s.tmax());
                        p = max(s.pop());
                    }
                }
            }
            out.add(new CitySnapshotDto(c.id, c.name, c.lat, c.lon, t, p));
        }
        return new PlSnapshotResponseDto(r.key, Instant.now(), out);
    }

    private static Double pickDouble(List<Double> list, int i) {
        if (list == null || list.isEmpty()) return null;
        i = Math.max(0, Math.min(i, list.size() - 1));
        Double v = list.get(i);
        return v != null && !v.isNaN() && !v.isInfinite() ? v : null;
    }

    private static Integer pickInt(List<Integer> list, int i) {
        if (list == null || list.isEmpty()) return null;
        i = Math.max(0, Math.min(i, list.size() - 1));
        return list.get(i);
    }

    private static Double avg(List<Double> list) {
        if (list == null || list.isEmpty()) return null;
        double sum = 0;
        int n = 0;
        for (Double v : list)
            if (v != null && !v.isNaN() && !v.isInfinite()) {
                sum += v;
                n++;
            }
        return n == 0 ? null : sum / n;
    }

    private static Integer max(List<Integer> list) {
        if (list == null || list.isEmpty()) return null;
        Integer m = null;
        for (Integer v : list) if (v != null) m = (m == null ? v : Math.max(m, v));
        return m;
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

    private static List<Integer> toIntList(JsonNode arr) {
        if (arr == null || !arr.isArray()) return List.of();
        List<Integer> out = new ArrayList<>(arr.size());
        arr.forEach(n -> out.add(n.isNull() ? null : n.asInt()));
        return out;
    }

    private enum Range {
        TODAY("today", 0), TOMORROW("tomorrow", 1), PLUS2("+2", 2), WEEK("week", -1);
        final String key;
        final int offset;

        Range(String key, int offset) {
            this.key = key;
            this.offset = offset;
        }

        static Range from(String s) {
            if (s == null) return TODAY;
            return switch (s.toLowerCase()) {
                case "tomorrow" -> TOMORROW;
                case "plus2", "+2", "day2" -> PLUS2;
                case "week", "7d" -> WEEK;
                default -> TODAY;
            };
        }
    }

    private record City(String id, String name, double lat, double lon) {
        static final List<City> ALL = List.of(
                new City("waw", "Warsaw", 52.2297, 21.0122),
                new City("krk", "Kraków", 50.0647, 19.9450),
                new City("ldz", "Łódź", 51.7592, 19.4550),
                new City("wro", "Wrocław", 51.1079, 17.0385),
                new City("poz", "Poznań", 52.4064, 16.9252),
                new City("gda", "Gdańsk", 54.3520, 18.6466),
                new City("szc", "Szczecin", 53.4285, 14.5528),
                new City("lub", "Lublin", 51.2465, 22.5684),
                new City("bia", "Białystok", 53.1325, 23.1688),
                new City("rze", "Rzeszów", 50.0412, 21.9991),
                new City("opl", "Opole", 50.6751, 17.9213),
                new City("ols", "Olsztyn", 53.7784, 20.4801),
                new City("tor", "Toruń", 53.0138, 18.5984),
                new City("zgo", "Zielona Góra", 51.9356, 15.5062),
                new City("kos", "Koszalin",     54.1940, 16.1720),
                new City("kie", "Kielce",       50.8661, 20.6286)
        );
    }
}