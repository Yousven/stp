<?php
error_reporting(E_ALL);
ini_set('display_errors', 1);
session_start();
if (!isset($_SESSION['user_id']) || $_SESSION['role'] !== 'admin') {
  header('Location: login.php');
  exit;
}
require_once '../config/config.php';
$pdo = getDBConnection();
if (!isset($_GET['id'])) {
  die("Object ID not provided.");
}
$id = $_GET['id'];
try {
  $stmt = $pdo->prepare("SELECT * FROM objects WHERE id = ?");
  $stmt->execute([$id]);
  $object = $stmt->fetch(PDO::FETCH_ASSOC);
  if (!$object) {
    die("Object not found.");
  }
  $stmt = $pdo->prepare("DELETE FROM objects WHERE id = ?");
  $stmt->execute([$id]);
  header("Location: admin_objects.php?msg=deleted");
  exit;
} catch (PDOException $e) {
  echo "Error: " . $e->getMessage();
}
?>
