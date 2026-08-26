import Foundation
import Capacitor
import CoreLocation

/**
 * Taustal töötav geofencing iOS-il.
 *
 * Kasutab CLLocationManager region monitoring't, mitte pidevat asukoha
 * jälgimist: OS valvab ringi ise (mobiilimastid/WiFi, mitte pidev GPS) ja
 * äratab äpi ainult piiri ületamisel. Aku kulu on seetõttu tühine, ka siis
 * kui äpp on täielikult suletud — iOS käivitab äpi taustal uuesti.
 *
 * Sündmused kirjutatakse UserDefaults järjekorda, mille JS tühjendab
 * serverisse äpi avamisel. Natiivne pool EI tee ise võrgupäringuid, et
 * JWT/refresh loogikat ei peaks kahes natiivkeeles dubleerima.
 */
@objc(BackgroundGeofencePlugin)
public class BackgroundGeofencePlugin: CAPPlugin, CAPBridgedPlugin, CLLocationManagerDelegate {
    public let identifier = "BackgroundGeofencePlugin"
    public let jsName = "BackgroundGeofence"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "startMonitoring", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "stopMonitoring", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "getPendingEvents", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "clearPendingEvents", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "checkPermissions", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "requestPermissions", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "isMocked", returnType: CAPPluginReturnPromise)
    ]

    private let locationManager = CLLocationManager()
    private let queueKey = "stp_pending_geofence_events"
    private var permissionCall: CAPPluginCall?

    override public func load() {
        locationManager.delegate = self

        // TAHTLIKULT ei seata siin `allowsBackgroundLocationUpdates` ega
        // `pausesLocationUpdatesAutomatically`. Need kaks puudutavad ainult
        // pidevat asukoha jälgimist (`startUpdatingLocation`), mida see
        // plugin ei kasuta — ja `pausesLocationUpdatesAutomatically = false`
        // lülitab välja just selle iOS-i energiasäästu, mis pideva jälgimise
        // vahele paneb. Taustal äratamiseks ei ole neid vaja: region
        // monitoring äratab äpi ka siis, kui see on mälust välja visatud.
        //
        // Kui keegi lisab kunagi `startUpdatingLocation` kutse, muutuvad
        // need read aku seisukohalt ohtlikuks — siis tuleb nad teadlikult
        // tagasi panna ja koos sellega üle vaadata, kas pidev jälgimine on
        // üldse vajalik.
    }

    // MARK: - Load / permissions

    // CAPPlugin defineerib need juba — seetõttu override + public.
    @objc override public func checkPermissions(_ call: CAPPluginCall) {
        call.resolve(["location": authorizationString(locationManager.authorizationStatus)])
    }

    @objc override public func requestPermissions(_ call: CAPPluginCall) {
        let status = locationManager.authorizationStatus
        if status == .authorizedAlways {
            call.resolve(["location": "granted"])
            return
        }
        // iOS lubab "Always" küsida alles pärast "When In Use" andmist,
        // seega küsime need järjest (teine küsimus tuleb delegate'i kaudu).
        permissionCall = call
        bridge?.saveCall(call)
        if status == .notDetermined {
            locationManager.requestWhenInUseAuthorization()
        } else {
            locationManager.requestAlwaysAuthorization()
        }
    }

    private func authorizationString(_ status: CLAuthorizationStatus) -> String {
        switch status {
        case .authorizedAlways: return "granted"
        case .notDetermined: return "prompt"
        // "When In Use" ei ole taustajälgimiseks piisav — raporteerime
        // "prompt", et JS saaks Always luba uuesti küsida.
        case .authorizedWhenInUse: return "prompt"
        default: return "denied"
        }
    }

    public func locationManagerDidChangeAuthorization(_ manager: CLLocationManager) {
        let status = manager.authorizationStatus
        if status == .authorizedWhenInUse {
            // Esimene samm läbitud — küsi nüüd taustaluba.
            manager.requestAlwaysAuthorization()
            return
        }
        if status == .notDetermined { return }

        if let call = permissionCall {
            call.resolve(["location": authorizationString(status)])
            bridge?.releaseCall(call)
            permissionCall = nil
        }
    }

    // MARK: - Monitoring

    @objc func startMonitoring(_ call: CAPPluginCall) {
        guard let identifier = call.getString("identifier"),
              let latitude = call.getDouble("latitude"),
              let longitude = call.getDouble("longitude"),
              let radius = call.getDouble("radius") else {
            call.reject("identifier, latitude, longitude ja radius on kohustuslikud")
            return
        }

        guard CLLocationManager.isMonitoringAvailable(for: CLCircularRegion.self) else {
            call.reject("Seade ei toeta geofencing't")
            return
        }

        stopAllRegions()

        // iOS-i enda ülemmäär: suuremat raadiust ta ei valva.
        let maxRadius = locationManager.maximumRegionMonitoringDistance
        let region = CLCircularRegion(
            center: CLLocationCoordinate2D(latitude: latitude, longitude: longitude),
            radius: min(radius, maxRadius),
            identifier: identifier
        )
        region.notifyOnEntry = true
        region.notifyOnExit = true

        locationManager.startMonitoring(for: region)
        call.resolve()
    }

    @objc func stopMonitoring(_ call: CAPPluginCall) {
        stopAllRegions()
        call.resolve()
    }

    private func stopAllRegions() {
        for region in locationManager.monitoredRegions {
            locationManager.stopMonitoring(for: region)
        }
    }

    public func locationManager(_ manager: CLLocationManager, didEnterRegion region: CLRegion) {
        enqueue(type: "ENTER", region: region)
    }

    public func locationManager(_ manager: CLLocationManager, didExitRegion region: CLRegion) {
        enqueue(type: "EXIT", region: region)
    }

    // MARK: - Mock location

    /**
     * iOS 15+ annab CLLocation'ile `sourceInformation`, mis ütleb, kas
     * asukoht tuli simulaatorist või võltsimisäpist. Vanematel versioonidel
     * seda infot pole, seega tagastame false.
     */
    @objc func isMocked(_ call: CAPPluginCall) {
        guard let location = locationManager.location else {
            call.resolve(["mocked": false])
            return
        }
        if #available(iOS 15.0, *) {
            let simulated = location.sourceInformation?.isSimulatedBySoftware ?? false
            call.resolve(["mocked": simulated])
        } else {
            call.resolve(["mocked": false])
        }
    }

    // MARK: - Event queue

    private func enqueue(type: String, region: CLRegion) {
        var event: [String: Any] = [
            "type": type,
            "occurredAt": ISO8601DateFormatter().string(from: Date())
        ]
        if let circular = region as? CLCircularRegion {
            event["latitude"] = circular.center.latitude
            event["longitude"] = circular.center.longitude
        }

        var queue = UserDefaults.standard.array(forKey: queueKey) as? [[String: Any]] ?? []
        queue.append(event)
        // Kaitse piiramatu kasvamise eest, kui äppi ei avata pikalt.
        if queue.count > 500 { queue = Array(queue.suffix(500)) }
        UserDefaults.standard.set(queue, forKey: queueKey)

        // Kui äpp on parasjagu avatud, anna JS-ile kohe teada.
        notifyListeners("geofenceEvent", data: ["type": type])
    }

    @objc func getPendingEvents(_ call: CAPPluginCall) {
        let queue = UserDefaults.standard.array(forKey: queueKey) as? [[String: Any]] ?? []
        call.resolve(["events": queue])
    }

    @objc func clearPendingEvents(_ call: CAPPluginCall) {
        guard let upTo = call.getString("upTo") else {
            UserDefaults.standard.removeObject(forKey: queueKey)
            call.resolve()
            return
        }

        // Kustuta ainult need sündmused, mis jõudsid serverisse — vahepeal
        // lisandunud uued jäävad järjekorda alles.
        let queue = UserDefaults.standard.array(forKey: queueKey) as? [[String: Any]] ?? []
        let remaining = queue.filter { event in
            guard let occurredAt = event["occurredAt"] as? String else { return false }
            return occurredAt > upTo
        }
        UserDefaults.standard.set(remaining, forKey: queueKey)
        call.resolve()
    }
}
