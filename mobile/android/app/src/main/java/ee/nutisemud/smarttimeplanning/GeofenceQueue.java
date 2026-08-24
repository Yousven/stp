package ee.nutisemud.smarttimeplanning;

import android.content.Context;
import android.content.SharedPreferences;

import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;

import java.text.SimpleDateFormat;
import java.util.Date;
import java.util.Locale;
import java.util.TimeZone;

/**
 * Kohaloleku sündmuste järjekord seadmes.
 *
 * Natiivne pool ei saada sündmusi ise serverisse (see nõuaks JWT ja
 * token-refreshi loogika dubleerimist Kotlinis/Javas) — sündmused hoitakse
 * siin kuni JS need äpi avamisel serverisse tõstab. Ajatempel pannakse
 * sündmuse toimumise hetkel, seega hiline üleslaadimine ei moonuta tunde.
 */
public final class GeofenceQueue {
    private static final String PREFS = "stp_geofence";
    private static final String KEY_EVENTS = "pending_events";
    private static final int MAX_EVENTS = 500;

    private GeofenceQueue() {}

    private static SharedPreferences prefs(Context context) {
        return context.getSharedPreferences(PREFS, Context.MODE_PRIVATE);
    }

    public static String isoNow() {
        SimpleDateFormat format = new SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'", Locale.US);
        format.setTimeZone(TimeZone.getTimeZone("UTC"));
        return format.format(new Date());
    }

    public static synchronized void add(Context context, String type, Double latitude, Double longitude) {
        try {
            JSONArray queue = read(context);
            JSONObject event = new JSONObject();
            event.put("type", type);
            event.put("occurredAt", isoNow());
            if (latitude != null) event.put("latitude", latitude);
            if (longitude != null) event.put("longitude", longitude);
            queue.put(event);

            // Kaitse piiramatu kasvamise eest, kui äppi ei avata pikalt.
            if (queue.length() > MAX_EVENTS) {
                JSONArray trimmed = new JSONArray();
                for (int i = queue.length() - MAX_EVENTS; i < queue.length(); i++) {
                    trimmed.put(queue.get(i));
                }
                queue = trimmed;
            }
            prefs(context).edit().putString(KEY_EVENTS, queue.toString()).apply();
        } catch (JSONException ignored) {
            // Üksik vigane sündmus ei tohi rakendust maha võtta.
        }
    }

    public static synchronized JSONArray read(Context context) {
        String raw = prefs(context).getString(KEY_EVENTS, "[]");
        try {
            return new JSONArray(raw);
        } catch (JSONException e) {
            return new JSONArray();
        }
    }

    /** Kustutab sündmused kuni antud ajatemplini (kaasa arvatud). */
    public static synchronized void clearUpTo(Context context, String upTo) {
        if (upTo == null) {
            prefs(context).edit().remove(KEY_EVENTS).apply();
            return;
        }
        try {
            JSONArray queue = read(context);
            JSONArray remaining = new JSONArray();
            for (int i = 0; i < queue.length(); i++) {
                JSONObject event = queue.getJSONObject(i);
                String occurredAt = event.optString("occurredAt", "");
                // ISO 8601 UTC stringe saab võrrelda leksikograafiliselt.
                if (occurredAt.compareTo(upTo) > 0) {
                    remaining.put(event);
                }
            }
            prefs(context).edit().putString(KEY_EVENTS, remaining.toString()).apply();
        } catch (JSONException ignored) {
        }
    }
}
