package ee.nutisemud.smarttimeplanning;

import android.Manifest;
import android.app.PendingIntent;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.os.Build;

import androidx.core.content.ContextCompat;

import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.Permission;
import com.getcapacitor.annotation.PermissionCallback;
import com.google.android.gms.location.Geofence;
import com.google.android.gms.location.GeofencingClient;
import com.google.android.gms.location.GeofencingRequest;
import com.google.android.gms.location.LocationServices;

/**
 * Taustal töötav geofencing Androidil (Play Services GeofencingClient).
 *
 * Nagu iOS-i vastes: OS valvab ringi ise ja äratab äpi ainult piiri
 * ületamisel, seega aku kulu on tühine võrreldes pideva GPS-pollimisega.
 */
@CapacitorPlugin(
    name = "BackgroundGeofence",
    permissions = {
        @Permission(alias = "location", strings = { Manifest.permission.ACCESS_FINE_LOCATION }),
        @Permission(alias = "backgroundLocation", strings = { Manifest.permission.ACCESS_BACKGROUND_LOCATION })
    }
)
public class BackgroundGeofencePlugin extends Plugin {
    private GeofencingClient geofencingClient;
    private PendingIntent geofencePendingIntent;

    @Override
    public void load() {
        geofencingClient = LocationServices.getGeofencingClient(getContext());
    }

    private PendingIntent getGeofencePendingIntent() {
        if (geofencePendingIntent != null) {
            return geofencePendingIntent;
        }
        Intent intent = new Intent(getContext(), GeofenceBroadcastReceiver.class);
        int flags = PendingIntent.FLAG_UPDATE_CURRENT;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            flags |= PendingIntent.FLAG_MUTABLE;
        }
        geofencePendingIntent = PendingIntent.getBroadcast(getContext(), 0, intent, flags);
        return geofencePendingIntent;
    }

    private boolean hasBackgroundPermission() {
        boolean fine = ContextCompat.checkSelfPermission(getContext(), Manifest.permission.ACCESS_FINE_LOCATION)
            == PackageManager.PERMISSION_GRANTED;
        if (!fine) return false;
        // ACCESS_BACKGROUND_LOCATION on eraldi luba alles Android 10-st (API 29).
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.Q) return true;
        return ContextCompat.checkSelfPermission(getContext(), Manifest.permission.ACCESS_BACKGROUND_LOCATION)
            == PackageManager.PERMISSION_GRANTED;
    }

    @PluginMethod
    public void checkPermissions(PluginCall call) {
        JSObject result = new JSObject();
        result.put("location", hasBackgroundPermission() ? "granted" : "prompt");
        call.resolve(result);
    }

    @PluginMethod
    public void requestPermissions(PluginCall call) {
        if (hasBackgroundPermission()) {
            JSObject result = new JSObject();
            result.put("location", "granted");
            call.resolve(result);
            return;
        }
        // Android nõuab, et taustaluba küsitaks eraldi, pärast esiplaani luba.
        requestPermissionForAlias("location", call, "locationPermissionCallback");
    }

    @PermissionCallback
    private void locationPermissionCallback(PluginCall call) {
        boolean fine = ContextCompat.checkSelfPermission(getContext(), Manifest.permission.ACCESS_FINE_LOCATION)
            == PackageManager.PERMISSION_GRANTED;

        if (fine && Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q && !hasBackgroundPermission()) {
            requestPermissionForAlias("backgroundLocation", call, "backgroundPermissionCallback");
            return;
        }

        JSObject result = new JSObject();
        result.put("location", hasBackgroundPermission() ? "granted" : "denied");
        call.resolve(result);
    }

    @PermissionCallback
    private void backgroundPermissionCallback(PluginCall call) {
        JSObject result = new JSObject();
        result.put("location", hasBackgroundPermission() ? "granted" : "denied");
        call.resolve(result);
    }

    @PluginMethod
    public void startMonitoring(PluginCall call) {
        String identifier = call.getString("identifier");
        Double latitude = call.getDouble("latitude");
        Double longitude = call.getDouble("longitude");
        Double radius = call.getDouble("radius");

        if (identifier == null || latitude == null || longitude == null || radius == null) {
            call.reject("identifier, latitude, longitude ja radius on kohustuslikud");
            return;
        }

        if (!hasBackgroundPermission()) {
            call.reject("Taustal asukoha luba puudub");
            return;
        }

        Geofence geofence = new Geofence.Builder()
            .setRequestId(identifier)
            .setCircularRegion(latitude, longitude, radius.floatValue())
            .setExpirationDuration(Geofence.NEVER_EXPIRE)
            .setTransitionTypes(Geofence.GEOFENCE_TRANSITION_ENTER | Geofence.GEOFENCE_TRANSITION_EXIT)
            .build();

        GeofencingRequest request = new GeofencingRequest.Builder()
            // Teatab kohe, kui äpp on juba raadiuse sees/väljas — muidu jääks
            // esimene olek teadmata kuni järgmise liikumiseni.
            .setInitialTrigger(GeofencingRequest.INITIAL_TRIGGER_ENTER)
            .addGeofence(geofence)
            .build();

        try {
            geofencingClient.removeGeofences(getGeofencePendingIntent());
            geofencingClient.addGeofences(request, getGeofencePendingIntent())
                .addOnSuccessListener(unused -> call.resolve())
                .addOnFailureListener(e -> call.reject("Geofence'i lisamine ebaõnnestus: " + e.getMessage()));
        } catch (SecurityException e) {
            call.reject("Asukoha luba puudub: " + e.getMessage());
        }
    }

    @PluginMethod
    public void stopMonitoring(PluginCall call) {
        geofencingClient.removeGeofences(getGeofencePendingIntent())
            .addOnSuccessListener(unused -> call.resolve())
            .addOnFailureListener(e -> call.reject("Geofence'i eemaldamine ebaõnnestus: " + e.getMessage()));
    }

    @PluginMethod
    public void getPendingEvents(PluginCall call) {
        JSObject result = new JSObject();
        try {
            result.put("events", JSArray.from(GeofenceQueue.read(getContext()).toString()));
        } catch (Exception e) {
            result.put("events", new JSArray());
        }
        call.resolve(result);
    }

    @PluginMethod
    public void clearPendingEvents(PluginCall call) {
        GeofenceQueue.clearUpTo(getContext(), call.getString("upTo"));
        call.resolve();
    }
}
