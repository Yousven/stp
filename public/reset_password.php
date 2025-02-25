<?php
// public/reset_password.php
error_reporting(E_ALL);
ini_set('display_errors', 1);
session_start();

// Set timezone for proper expiration calculations – ära muuda seda!
date_default_timezone_set('Europe/Tallinn');

require_once '../config/config.php';
$pdo = getDBConnection();

// Retrieve token from GET parameter
$token = $_GET['token'] ?? '';

if (!$token) {
    die("Token puudub.");
}

// Look up the token in the password_resets table along with user data
$stmt = $pdo->prepare("SELECT pr.*, u.email, u.username FROM password_resets pr JOIN users u ON pr.user_id = u.id WHERE token = ?");
$stmt->execute([$token]);
$resetData = $stmt->fetch(PDO::FETCH_ASSOC);

if (!$resetData) {
    die("Token on vale või aegunud. (Debug: Token not found in DB)");
}

// Get current time and compare with token expiration
$currentTime = date("Y-m-d H:i:s");
if ($currentTime > $resetData['expires_at']) {
    die("Token on vale või aegunud. (Debug: Current time ($currentTime) is greater than token expiry (" . $resetData['expires_at'] . "))");
}

$error = '';
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $password = trim($_POST['password'] ?? '');
    $confirmPassword = trim($_POST['confirm_password'] ?? '');
    
    if ($password === '' || $confirmPassword === '') {
        $error = "Palun sisesta uus parool ja kinnita see.";
    } elseif ($password !== $confirmPassword) {
        $error = "Paroolid ei ühti.";
    }
    
    // Validate password: at least 12 characters, one number, and one symbol
    if (empty($error)) {
        if (strlen($password) < 12) {
            $error = "Parool peab olema vähemalt 12 tähemärki pikk.";
        } elseif (!preg_match('/\d/', $password)) {
            $error = "Parool peab sisaldama vähemalt ühte numbrit.";
        } elseif (!preg_match('/[\W_]/', $password)) {
            $error = "Parool peab sisaldama vähemalt ühte sümbolit.";
        }
    }
    
    if (empty($error)) {
        // Hash the new password
        $hashedPassword = password_hash($password, PASSWORD_DEFAULT);
        $stmtUpdate = $pdo->prepare("UPDATE users SET password = ? WHERE id = ?");
        $stmtUpdate->execute([$hashedPassword, $resetData['user_id']]);
        
        // Delete the used token to prevent reuse
        $stmtDelete = $pdo->prepare("DELETE FROM password_resets WHERE token = ?");
        $stmtDelete->execute([$token]);
        
        $success = "Parool on edukalt uuendatud. Palun logige sisse uue parooliga.";
    }
}
?>
<!DOCTYPE html>
<html lang="et">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Seada uus parool</title>
  <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet">
  <link rel="stylesheet" href="style.css">
  <style>
    body {
      background: linear-gradient(135deg, #ece9e6, #ffffff);
      min-height: 100vh;
      display: flex;
      flex-direction: column;
    }
    .container {
      animation: fadeIn 1s ease-in-out;
      margin-top: 40px;
      margin-bottom: 40px;
    }
    @keyframes fadeIn {
      from { opacity: 0; transform: translateY(10px); }
      to { opacity: 1; transform: translateY(0); }
    }
  </style>
</head>
<body class="bg-light">
  <div class="container">
    <div class="card shadow-sm">
      <div class="card-header bg-primary text-white">
        <h2 class="card-title mb-0 text-center">Seada uus parool</h2>
      </div>
      <div class="card-body">
        <?php if (!empty($error)): ?>
          <div class="alert alert-danger" id="alertMessage"><?php echo htmlspecialchars($error); ?></div>
        <?php elseif (isset($success)): ?>
          <div class="alert alert-success" id="alertMessage"><?php echo htmlspecialchars($success); ?></div>
          <div class="text-center">
            <a href="login.php" class="btn btn-primary">Logi sisse</a>
          </div>
        <?php endif; ?>
        <form action="reset_password.php?token=<?php echo htmlspecialchars($token); ?>" method="post">
          <div class="mb-3">
            <label for="password" class="form-label">Uus parool:</label>
            <input type="password" name="password" id="password" class="form-control" placeholder="Sisesta uus parool" required>
            <div class="form-text">Parool peab olema vähemalt 12 tähemärki pikk, sisaldama vähemalt ühte numbrit ja ühte sümbolit.</div>
          </div>
          <div class="mb-3">
            <label for="confirm_password" class="form-label">Kinnita uus parool:</label>
            <input type="password" name="confirm_password" id="confirm_password" class="form-control" placeholder="Kinnita uus parool" required>
          </div>
          <button type="submit" class="btn btn-primary w-100">Salvesta uus parool</button>
        </form>
      </div>
    </div>
    <div class="text-center mt-3">
      <a href="login.php">Tagasi sisselogimislehele</a>
    </div>
  </div>
  <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/js/bootstrap.bundle.min.js"></script>
  <script>
    // Fade-out alert message after 5 seconds
    setTimeout(function(){
      var alertElem = document.getElementById("alertMessage");
      if (alertElem) {
        alertElem.classList.add("fade");
        setTimeout(function() {
          alertElem.style.display = "none";
        }, 1000);
      }
    }, 5000);
  </script>
</body>
</html>
