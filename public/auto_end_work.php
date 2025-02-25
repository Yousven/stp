<?php
session_start();
if (!isset($_SESSION['user_id'])) {
    http_response_code(403);
    exit;
}

require_once '../config/config.php';
$pdo = getDBConnection();

// Laadi seaded andmebaasist
$stmtSettings = $pdo->query("SELECT setting_key, setting_value FROM settings");
$settings = $stmtSettings->fetchAll(PDO::FETCH_KEY_PAIR);

// Määra seadetest laetud väärtused või kasuta vaikimisi
$checkInDeadline = isset($settings['check_in_deadline']) 
    ? date("Y-m-d") . " " . $settings['check_in_deadline'] 
    : date("Y-m-d 09:00:00");
$checkOutDeadline = isset($settings['check_out_deadline']) 
    ? date("Y-m-d") . " " . $settings['check_out_deadline'] 
    : date("Y-m-d 18:00:00");
$allowedRadius = isset($settings['allowed_radius']) ? (float)$settings['allowed_radius'] : 100;
$tolerance = isset($settings['tolerance']) ? (float)$settings['tolerance'] : 5;
$adminEmail = isset($settings['admin_email']) ? $settings['admin_email'] : 'admin@example.com';

/**
 * Arvutab kahe geograafilise punkti vahe Haversine valemi abil.
 *
 * @param float $lat1 Kasutaja laiuskraad
 * @param float $lon1 Kasutaja pikkuskraad
 * @param float $lat2 Objekti laiuskraad
 * @param float $lon2 Objekti pikkuskraad
 * @return float Vahe meetrites
 */
function getDistance($lat1, $lon1, $lat2, $lon2) {
    $earthRadius = 6371000; // Maa raadius meetrites
    $dLat = deg2rad($lat2 - $lat1);
    $dLon = deg2rad($lon2 - $lon1);
    $a = sin($dLat/2) * sin($dLat/2) +
         cos(deg2rad($lat1)) * cos(deg2rad($lat2)) *
         sin($dLon/2) * sin($dLon/2);
    $c = 2 * atan2(sqrt($a), sqrt(1 - $a));
    return $earthRadius * $c;
}

// Kontrollime, kas kasutajal on aktiivne töölogi (kus end_time on NULL)
$stmt = $pdo->prepare("SELECT id, lunch, comment, object_id FROM time_logs WHERE user_id = ? AND end_time IS NULL");
$stmt->execute([$_SESSION['user_id']]);
$activeLog = $stmt->fetch(PDO::FETCH_ASSOC);

if ($activeLog) {
    // Kasuta värskendatud asukohaandmeid, kui need on saadetud (nt GET parameetrite kaudu)
    $userLat = isset($_SESSION['current_lat']) ? (float) $_SESSION['current_lat'] : null;
    $userLng = isset($_SESSION['current_lng']) ? (float) $_SESSION['current_lng'] : null;
    
    if ($userLat !== null && $userLng !== null) {
        // Laadi objekti andmed tabelist, kasutades aktiivse tööloga object_id
        $stmtObject = $pdo->prepare("SELECT latitude, longitude FROM objects WHERE id = ?");
        $stmtObject->execute([$activeLog['object_id']]);
        $objectData = $stmtObject->fetch(PDO::FETCH_ASSOC);
        
        if ($objectData) {
            $objectLat = (float)$objectData['latitude'];
            $objectLng = (float)$objectData['longitude'];
        } else {
            // Kui objekti andmeid ei leita, kasuta vaikimisi väärtusi
            $objectLat = 59.43696;
            $objectLng = 24.75358;
        }
        
        // Arvuta kaugus
        $distance = getDistance($userLat, $userLng, $objectLat, $objectLng);
        error_log("Kasutaja kaugus objekti keskpunktist: " . $distance . " meetrit.");
        
        // Kui kasutaja on väljaspool lubatud raadiust (lisatolerantsiga)
        if ($distance > ($allowedRadius + $tolerance)) {
            try {
                $updateQuery = "UPDATE time_logs 
                                SET end_time = NOW(), 
                                    comment = CONCAT(IFNULL(comment, ''), ' [Lõpetatud automaatselt, kuna objekti raadiusest väljas (kaugus: " . round($distance, 2) . " m)]'),
                                    lunch = 0 
                                WHERE id = ?";
                $stmtUpdate = $pdo->prepare($updateQuery);
                $stmtUpdate->execute([$activeLog['id']]);
                
                if ($stmtUpdate->rowCount() == 0) {
                    error_log("Ei muudetud ühtegi töölogi kirjet log_id-ga: " . $activeLog['id']);
                }
            } catch (PDOException $e) {
                error_log("Tööaja logi uuendamine ebaõnnestus: " . $e->getMessage());
            }
            
            // Laadi kasutaja andmed, et saata teavitus e-kirjaga
            $stmtUser = $pdo->prepare("SELECT email, username FROM users WHERE id = ?");
            $stmtUser->execute([$_SESSION['user_id']]);
            $user = $stmtUser->fetch(PDO::FETCH_ASSOC);
            
            if ($user) {
                $to = $user['email'];
                $subject = "Teie tööpäev on automaatselt lõpetatud";
                $message = "Tere " . $user['username'] . ",\n\nTeie tööpäev on automaatselt lõpetatud, kuna teie asukoht on väljaspool lubatud piirkonda (kaugus: " . round($distance,2) . " meetrit).\nKui teil on küsimusi või vajate abi, võtke palun ühendust oma juhiga.\n\nParimate soovidega,\nTööajaarvestuse süsteem";
                $headers = "From: no-reply@example.com\r\n" .
                           "Reply-To: no-reply@example.com\r\n" .
                           "X-Mailer: PHP/" . phpversion();
                
                $mailResult = mail($to, $subject, $message, $headers);
                if (!$mailResult) {
                    error_log("E-kirja saatmine ebaõnnestus kasutajale ID " . $_SESSION['user_id'] . " e-mailile: " . $user['email']);
                }
            }
        }
    } else {
        error_log("Kasutaja asukoha andmed puuduvad, ei saa objekti raadiust kontrollida.");
    }
}

echo "Kontroll lõpetatud.";
?>
