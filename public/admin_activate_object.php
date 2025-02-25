<?php
error_reporting(E_ALL);
ini_set('display_errors', 1);

session_start();
if (!isset($_SESSION['user_id']) || $_SESSION['role'] !== 'admin') {
  header('Location: login.php');
  exit;
}

// Laadime andmebaasi konfiguratsiooni
require_once '../config/config.php';
$pdo = getDBConnection();
if (!$pdo) {
  error_log("activate_object.php: Andmebaasi ühendus ebaõnnestus.");
  die("Andmebaasi ühendus ebaõnnestus.");
}

// Autoload Monolog-i jaoks
require_once __DIR__ . '/../vendor/autoload.php';

use Monolog\Logger;
use Monolog\Handler\StreamHandler;

// Loo logija "admin_objects" kanalile ja kirjuta logid faili /logs/admin_objects.log
$log = new Logger('admin_objects');
$log->pushHandler(new StreamHandler(__DIR__ . '/../logs/admin_objects.log', Logger::DEBUG));

if (!isset($_GET['id'])) {
  $log->error("activate_object.php: Object ID ei ole määratud.");
  die("Object ID not provided.");
}

$id = $_GET['id'];

try {
  // Objekti päring andmebaasist
  $stmt = $pdo->prepare("SELECT * FROM objects WHERE id = ?");
  $stmt->execute([$id]);
  $object = $stmt->fetch(PDO::FETCH_ASSOC);

  if (!$object) {
    $log->error("activate_object.php: Objektid ei leitud.", ['id' => $id]);
    die("Object not found.");
  }

  // Aktiveeri objekt (set deleted = 0)
  $stmt = $pdo->prepare("UPDATE objects SET deleted = 0 WHERE id = ?");
  $stmt->execute([$id]);

  $log->info("activate_object.php: Objekt aktiveeritud edukalt.", ['id' => $id]);

  header("Location: admin_objects.php?msg=activated");
  exit;
} catch (PDOException $e) {
  $log->error("activate_object.php: Andmebaasi viga objekti aktiveerimisel.", ['exception' => $e]);
  echo "Error: " . $e->getMessage();
}
?>