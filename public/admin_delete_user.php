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
    die('Kasutaja ID puudub.');
}

$id = $_GET['id'];

try {
    // Kontrollime, kas selline kasutaja eksisteerib
    $stmt = $pdo->prepare("SELECT * FROM users WHERE id = ?");
    $stmt->execute([$id]);
    $user = $stmt->fetch(PDO::FETCH_ASSOC);
    if (!$user) {
        die('Kasutajat ei leitud.');
    }
    
    // Proovi kustutada kasutaja
    $stmt = $pdo->prepare("DELETE FROM users WHERE id = ?");
    $stmt->execute([$id]);
    
    if ($stmt->rowCount() > 0) {
        header('Location: admin_users.php?msg=deleted');
        exit;
    } else {
        // Kui kustutamist ei õnnestu, võib see tähendada, et kasutajal on seotud kirjed (nt töölogid)
        echo "Kasutajat ei saanud kustutada. Kontrolli, kas kasutajale on seotud tööaja kirjed, mis takistavad kustutamist.";
    }
} catch (PDOException $e) {
    echo "Viga: " . $e->getMessage();
}
?>
