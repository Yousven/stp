<?php
session_start();
require_once '../config/config.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    header('Location: login.php');
    exit;
}

$username = trim($_POST['username'] ?? '');
$password = trim($_POST['password'] ?? '');

if ($username === '' || $password === '') {
    $_SESSION['error'] = "Palun sisesta nii kasutajanimi kui ka parool.";
    header('Location: login.php');
    exit;
}

try {
    $pdo = getDBConnection();
    $stmt = $pdo->prepare("SELECT * FROM users WHERE username = ?");
    $stmt->execute([$username]);
    $user = $stmt->fetch(PDO::FETCH_ASSOC);

    if ($user && password_verify($password, $user['password'])) {
        $_SESSION['user_id'] = $user['id'];
        $_SESSION['username'] = $user['username'];
        $_SESSION['role'] = $user['role'];
        header('Location: dashboard.php');
        exit;
    } else {
        $_SESSION['error'] = "Vale kasutajanimi või parool.";
        header('Location: login.php');
        exit;
    }
} catch (Exception $e) {
    error_log("Sisselogimise viga: " . $e->getMessage());
    $_SESSION['error'] = "Sisselogimisel tekkis probleem. Palun proovi uuesti.";
    header('Location: login.php');
    exit;
}
?>
