<?php
error_reporting(E_ALL);
ini_set('display_errors', 1);
session_start();
if (!isset($_SESSION['user_id']) || $_SESSION['role'] !== 'admin') {
    header("Location: login.php");
    exit;
}

require_once '../config/config.php';
$pdo = getDBConnection();
if (!$pdo) {
    die("Andmebaasi ühendus ebaõnnestus.");
}

// Autoload Monolog-i jaoks (eeldame, et composer autoload on olemas)
require_once __DIR__ . '/../vendor/autoload.php';

use Monolog\Logger;
use Monolog\Handler\StreamHandler;

// Loo logija "update_work_log" kanalile ja kirjuta logid faili /logs/update_work_log.log
$log = new Logger('update_work_log');
$log->pushHandler(new StreamHandler(__DIR__ . '/../logs/update_work_log.log', Logger::DEBUG));

// Võta POST andmed
$log_id = $_POST['log_id'] ?? null;
$work_duration = $_POST['work_duration'] ?? null;
$lunch = $_POST['lunch'] ?? null;
$travel_duration = $_POST['travel_duration'] ?? null;

if (!$log_id || $work_duration === null || $lunch === null || $travel_duration === null) {
    $log->error("update_work_log.php: Puuduvad vajalikud andmed.", $_POST);
    die("Viga: Kõik väljad peavad olema täidetud.");
}

try {
    // Uuenda tööaja kirjet – salvestame manuaalselt sisestatud päeva tunnid, lõuna ja sõidu kestuse
    $stmt = $pdo->prepare("UPDATE time_logs SET manual_work_duration = ?, lunch = ?, travel_duration = ? WHERE id = ?");
    $stmt->execute([$work_duration, $lunch, $travel_duration, $log_id]);
    $log->info("update_work_log.php: Tööaja kirje uuendatud edukalt.", ['log_id' => $log_id]);
    header("Location: work_history.php?msg=updated");
    exit;
} catch (PDOException $e) {
    $log->error("update_work_log.php: Andmebaasi viga tööaja kirje uuendamisel.", ['exception' => $e]);
    die("Viga: " . $e->getMessage());
}
?>