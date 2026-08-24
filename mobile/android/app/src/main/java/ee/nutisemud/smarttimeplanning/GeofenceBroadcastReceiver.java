package ee.nutisemud.smarttimeplanning;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;

import com.google.android.gms.location.Geofence;
import com.google.android.gms.location.GeofencingEvent;

import java.util.List;

/**
 * Võtab vastu Play Services'i geofence-sündmused. Töötab ka siis, kui äpp on
 * suletud — Android äratab selle receiveri ise, ilma et WebView peaks jooksma.
 * Seetõttu kirjutame ainult järjekorda; serverisse saatmine käib JS-i kaudu
 * äpi järgmisel avamisel.
 */
public class GeofenceBroadcastReceiver extends BroadcastReceiver {
    @Override
    public void onReceive(Context context, Intent intent) {
        GeofencingEvent event = GeofencingEvent.fromIntent(intent);
        if (event == null || event.hasError()) {
            return;
        }

        int transition = event.getGeofenceTransition();
        String type;
        if (transition == Geofence.GEOFENCE_TRANSITION_ENTER) {
            type = "ENTER";
        } else if (transition == Geofence.GEOFENCE_TRANSITION_EXIT) {
            type = "EXIT";
        } else {
            return;
        }

        Double latitude = null;
        Double longitude = null;
        if (event.getTriggeringLocation() != null) {
            latitude = event.getTriggeringLocation().getLatitude();
            longitude = event.getTriggeringLocation().getLongitude();
        }

        List<Geofence> triggering = event.getTriggeringGeofences();
        if (triggering == null || triggering.isEmpty()) {
            return;
        }

        GeofenceQueue.add(context, type, latitude, longitude);
    }
}
