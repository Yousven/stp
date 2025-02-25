<?php
// Production settings: vead ei kuvata kasutajale, vaid logitakse
ini_set('display_errors', '0');
error_reporting(0);

// Turvalised sessiooni küpsised (kui kasutad HTTPS-i)
ini_set('session.cookie_secure', '1');      // Küpsised saadetakse ainult üle HTTPS-i
ini_set('session.cookie_httponly', '1');      // JavaScript ei pääse küpsistele juurde
if (PHP_VERSION_ID >= 70300) {
    ini_set('session.cookie_samesite', 'Lax');  // Võib olla "Strict" või "Lax"
}

// Andmebaasi konfiguratsioon – muuda vastavalt oma seadetele
$db_host = 'localhost';
$db_name = 'time_tracking';
$db_user = 'app';
$db_pass = 'Morphing-Crispy5-Shabby';

try {
    $pdo = new PDO("mysql:host={$db_host};dbname={$db_name};charset=utf8mb4", $db_user, $db_pass);
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    $pdo->setAttribute(PDO::ATTR_EMULATE_PREPARES, false);
} catch (PDOException $e) {
    error_log("DB Connection Error: " . $e->getMessage());
    die("Ühenduse loomine ebaõnnestus.");
}

function getDBConnection() {
    global $pdo;
    return $pdo;
}
?>
