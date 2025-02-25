<?php
// send_reminders.php
error_reporting(E_ALL);
ini_set('display_errors', 1);

date_default_timezone_set('Europe/Tallinn');
require_once 'config/config.php';
$pdo = getDBConnection();

// Laeme seadistused tabelist "settings"
$stmtSettings = $pdo->query("SELECT setting_key, setting_value FROM settings");
$settings = $stmtSettings->fetchAll(PDO::FETCH_KEY_PAIR);

// Määra check-in ja check-out tähtaegade ajad vastavalt seadetele
$todayStart = date("Y-m-d 00:00:00");
$todayEnd   = date("Y-m-d 23:59:59");

// Kui seaded on olemas, kasuta neid, muidu vaikimisi väärtused
$checkInDeadline = isset($settings['check_in_deadline']) ? date("Y-m-d", strtotime("today")) . " " . $settings['check_in_deadline'] : date("Y-m-d 09:00:00");
$checkOutDeadline = isset($settings['check_out_deadline']) ? date("Y-m-d", strtotime("today")) . " " . $settings['check_out_deadline'] : date("Y-m-d 18:00:00");

$allowedRadius = isset($settings['allowed_radius']) ? (float)$settings['allowed_radius'] : 100;
$tolerance = isset($settings['tolerance']) ? (float)$settings['tolerance'] : 5;
$adminEmail = isset($settings['admin_email']) ? $settings['admin_email'] : 'admin@example.com';

// Otsime töötajaid, kes pole registreerinud enne check-in tähtaega
$queryIn = "SELECT u.id, u.username 
            FROM users u 
            WHERE u.role IN ('employee', 'admin')
              AND u.id NOT IN (
                SELECT user_id FROM time_logs 
                WHERE start_time BETWEEN ? AND ?
              )";
$stmtIn = $pdo->prepare($queryIn);
$stmtIn->execute([$todayStart, $checkInDeadline]);
$lateCheckIns = $stmtIn->fetchAll(PDO::FETCH_ASSOC);

// Otsime töötajaid, kellel on aktiivne töölog (end_time IS NULL) ja kes on sisse registreerinud enne check-out tähtaega
$queryOut = "SELECT u.id, u.username, tl.start_time 
             FROM time_logs tl
             JOIN users u ON tl.user_id = u.id 
             WHERE tl.end_time IS NULL 
               AND tl.start_time < ?";
$stmtOut = $pdo->prepare($queryOut);
$stmtOut->execute([$checkOutDeadline]);
$noCheckOuts = $stmtOut->fetchAll(PDO::FETCH_ASSOC);

// Koosta e-kirja sisu
$subject = "Tööajaarvestuse meeldetuletus";
$message = "Tere,\n\nJärgnevad töötajad pole registreerinud oma tööaja tähtaegselt:\n\n";

if(count($lateCheckIns) > 0) {
    $message .= "Puudub registreerimine enne " . date("H:i", strtotime($checkInDeadline)) . ":\n";
    foreach($lateCheckIns as $emp) {
        $message .= "- " . $emp['username'] . "\n";
    }
    $message .= "\n";
}

if(count($noCheckOuts) > 0) {
    $message .= "Puudub tööaja lõpetamine pärast " . date("H:i", strtotime($checkOutDeadline)) . ":\n";
    foreach($noCheckOuts as $emp) {
        $message .= "- " . $emp['username'] . " (registreeritud: " . $emp['start_time'] . ")\n";
    }
    $message .= "\n";
}

$message .= "Palun kontrolli süsteemi.\n\nParimate soovidega,\nTööajaarvestuse süsteem";

// E-kirja päised UTF-8 toetuseks
$headers = "From: no-reply@example.com\r\n" .
           "Reply-To: no-reply@example.com\r\n" .
           "Content-Type: text/plain; charset=UTF-8\r\n" .
           "X-Mailer: PHP/" . phpversion();

// Saada e-kiri, kui meeldetuletusi on vaja
if(count($lateCheckIns) > 0 || count($noCheckOuts) > 0) {
    $mailResult = mail($adminEmail, $subject, $message, $headers);
    if (!$mailResult) {
        error_log("E-kirja saatmine ebaõnnestus adminile: " . $adminEmail);
    }
}

echo "Kontroll lõpetatud.";
?>
