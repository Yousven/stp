package ee.nutisemud.smarttimeplanning;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(android.os.Bundle savedInstanceState) {
        // Kohalik plugin peab olema registreeritud enne super.onCreate'i,
        // muidu ei leia WebView seda üles.
        registerPlugin(BackgroundGeofencePlugin.class);
        super.onCreate(savedInstanceState);
    }
}
