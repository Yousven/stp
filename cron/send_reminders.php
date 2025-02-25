<?php
// send_reminders.php
error_reporting(E_ALL);
ini_set('display_errors', 1);

// Määra ajavööndiks Tallinn
date_default_timezone_set('Europe/Tallinn');

require_once __DIR__ . '/../config/config.php';
$pdo = getDBConnection();

// Admini e-posti aadress (võid selle määrata konfiguratsioonis või siia)
$adminEmail = 'marx.playshd@gmail.com';

// Määrame tänase kuupäeva ja aja piirid, kasutades DateTime klasse
$today = new DateTime('today');
$todayStart = $today->format('Y-m-d 00:00:00');
$todayEnd   = $today->format('Y-m-d 23:59:59');

// Defineerime kontrollide tähtaegade ajad
$checkInDeadline = (new DateTime('today 09:00:00'))->format('Y-m-d H:i:s');   // hommik 9:00
$checkOutDeadline = (new DateTime('today 18:00:00'))->format('Y-m-d H:i:s');  // õhtu 18:00

// Otsime töötajaid, kes ei ole hommikul 09:00-ni registreerinud
$queryIn = "SELECT u.id, u.username 
            FROM users u 
            WHERE u.role = 'employee'
              AND u.id NOT IN (
                SELECT user_id FROM time_logs 
                WHERE start_time BETWEEN ? AND ?
              )";
$stmtIn = $pdo->prepare($queryIn);
$stmtIn->execute([$todayStart, $checkInDeadline]);
$lateCheckIns = $stmtIn->fetchAll(PDO::FETCH_ASSOC);

// Otsime töötajaid, kellel on aktiivne töölog (end_time IS NULL) ja kes on sisse registreerinud enne 18:00
$queryOut = "SELECT u.id, u.username, tl.start_time 
             FROM time_logs tl
             JOIN users u ON tl.user_id = u.id 
             WHERE tl.end_time IS NULL 
               AND tl.start_time < ?";
$stmtOut = $pdo->prepare($queryOut);
$stmtOut->execute([$checkOutDeadline]);
$noCheckOuts = $stmtOut->fetchAll(PDO::FETCH_ASSOC);

// Koosta e-kirja sisu, kasutades heredoc süntaksit
$subject = "Tööajaarvestuse meeldetuletus";
$message = <<<EOD
Tere,

Järgnevad töötajad pole registreerinud oma tööaega tähtaegselt:

EOD;

if (count($lateCheckIns) > 0) {
    $message .= "\nPuudub registreerimine enne 09:00:\n";
    foreach ($lateCheckIns as $emp) {
        $message .= "- " . $emp['username'] . "\n";
    }
    $message .= "\n";
}

if (count($noCheckOuts) > 0) {
    $message .= "\nPuudub tööaja lõpetamine pärast 18:00:\n";
    foreach ($noCheckOuts as $emp) {
        $message .= "- " . $emp['username'] . " (registreeritud: " . $emp['start_time'] . ")\n";
    }
    $message .= "\n";
}

$message .= "\nPalun kontrolli süsteemi.\n\nParimate soovidega,\nTööajaarvestuse süsteem";

// Lisa täiendavad päised UTF-8 toetuseks
$headers = "From: no-reply@example.com\r\n" .
           "Reply-To: no-reply@example.com\r\n" .
           "Content-Type: text/plain; charset=UTF-8\r\n" .
           "X-Mailer: PHP/" . phpversion();

// Saada e-kiri, kui mõni meeldetuletus on vajalik
if (count($lateCheckIns) > 0 || count($noCheckOuts) > 0) {
    $mailResult = mail($adminEmail, $subject, $message, $headers);
    if (!$mailResult) {
        error_log("E-kirja saatmine ebaõnnestus adminile: " . $adminEmail);
    }
}
?>
