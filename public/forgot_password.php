<?php
// public/forgot_password.php
error_reporting(E_ALL);
ini_set('display_errors', 1);
session_start();
date_default_timezone_set('Europe/Tallinn');

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    require_once '../config/config.php';
    $pdo = getDBConnection();
    
    $email = trim($_POST['email'] ?? '');
    
    if ($email === '') {
        $error = "Palun sisesta oma e-maili aadress.";
    } else {
        // Kontrollime, kas sellise e-mailiga kasutaja eksisteerib
        $stmt = $pdo->prepare("SELECT id, username FROM users WHERE email = ?");
        $stmt->execute([$email]);
        $user = $stmt->fetch(PDO::FETCH_ASSOC);
        
        if ($user) {
            // Genereeri unikaalne token ja kehtivusaeg (+1 tund)
            $token = bin2hex(random_bytes(16));
            $expires_at = date("Y-m-d H:i:s", strtotime("+1 hour"));
            
            // Salvestame tokeni andmebaasi (veendu, et tabel 'password_resets' on loodud)
            $stmt = $pdo->prepare("INSERT INTO password_resets (user_id, token, expires_at) VALUES (?, ?, ?)");
            $stmt->execute([$user['id'], $token, $expires_at]);
            
            // Koosta parooli taastamise link (kasuta HTTPS ja õiget domeeni)
            $resetLink = "https://tarmel.gretmar.ee/reset_password.php?token=" . $token;
            
            $subject = "Parooli taastamise juhised";
            $message = "Tere " . $user['username'] . ",\n\n";
            $message .= "Olete palunud parooli taastamist. Klõpsake alloleval lingil või kleepige see oma brauserisse, et seada uus parool:\n";
            $message .= $resetLink . "\n\n";
            $message .= "See link kehtib ühe tunni jooksul.\n\n";
            $message .= "Parimate soovidega,\nTööajaarvestuse süsteem";
            
            $headers = "From: no-reply@tarmel.gretmar.ee\r\n" .
                       "Reply-To: no-reply@tarmel.gretmar.ee\r\n" .
                       "X-Mailer: PHP/" . phpversion();
            
            mail($email, $subject, $message, $headers);
            
            $success = "Parooli taastamise juhised on saadetud teie e-mailile.";
        } else {
            $error = "Selle e-mailiga kasutajat ei leitud.";
        }
    }
}
?>
<!DOCTYPE html>
<html lang="et">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Unustasid parooli?</title>
  <!-- Bootstrap 5 CSS -->
  <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet">
  <!-- Custom CSS -->
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
      margin-top: 20px;
      margin-bottom: 20px;
    }
    @keyframes fadeIn {
      from { opacity: 0; transform: translateY(10px); }
      to { opacity: 1; transform: translateY(0); }
    }
  </style>
</head>
<body class="bg-light">
  <div class="container py-4">
    <div class="card shadow-sm">
      <div class="card-header bg-primary text-white">
        <h1 class="card-title mb-0 text-center">Parooli taastamine</h1>
      </div>
      <div class="card-body">
        <?php if (isset($error)): ?>
          <div class="alert alert-danger" id="alertMessage"><?php echo htmlspecialchars($error); ?></div>
        <?php elseif (isset($success)): ?>
          <div class="alert alert-success" id="alertMessage"><?php echo htmlspecialchars($success); ?></div>
        <?php endif; ?>
        <form action="forgot_password.php" method="post">
          <div class="mb-3">
            <label for="email" class="form-label">Sisesta oma e-maili aadress:</label>
            <input type="email" name="email" id="email" class="form-control" placeholder="nt kasutaja@domeen.ee" required>
          </div>
          <button type="submit" class="btn btn-primary w-100">Saada taastamise juhised</button>
        </form>
        <div class="text-center mt-3">
          <a href="login.php">Tagasi sisselogimislehele</a>
        </div>
      </div>
    </div>
  </div>
  <!-- Bootstrap JS Bundle -->
  <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/js/bootstrap.bundle.min.js"></script>
  <!-- Lisa vajadusel lisainteraktiivsust (näiteks fade-out teated) -->
  <script>
    // Näiteks fade-out alert sõnum pärast 5 sekundit
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
