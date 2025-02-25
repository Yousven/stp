<?php
session_start();
if (!isset($_SESSION['user_id']) || $_SESSION['role'] !== 'admin') {
    header("Location: login.php");
    exit;
}
require_once '../config/config.php';
$pdo = getDBConnection();

// Kui vorm on saadetud, uuendame seadistusi ja suuname dashboardile
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $settings = [
        'check_in_deadline' => $_POST['check_in_deadline'] ?? '',
        'check_out_deadline' => $_POST['check_out_deadline'] ?? '',
        'tolerance' => $_POST['tolerance'] ?? '',
        'admin_email' => $_POST['admin_email'] ?? ''
    ];
    
    $stmtUpdate = $pdo->prepare("REPLACE INTO settings (setting_key, setting_value) VALUES (?, ?)");
    foreach ($settings as $key => $value) {
        $stmtUpdate->execute([$key, $value]);
    }
    
    // Suuna tagasi dashboardile pärast edukat salvestamist
    header("Location: dashboard.php?settings=success");
    exit;
}

// Laeme seadistused
$stmt = $pdo->query("SELECT setting_key, setting_value FROM settings");
$settingsData = $stmt->fetchAll(PDO::FETCH_KEY_PAIR);

// Määra vaikimisi väärtused, kui seadeid pole veel olemas
$checkInDeadline = $settingsData['check_in_deadline'] ?? '09:00:00';
$checkOutDeadline = $settingsData['check_out_deadline'] ?? '18:00:00';
$tolerance = $settingsData['tolerance'] ?? '5';
$adminEmail = $settingsData['admin_email'] ?? 'admin@example.com';
?>
<!DOCTYPE html>
<html lang="et">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Admin seadistused</title>
  <!-- Bootstrap 5 CSS -->
  <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet">
  <!-- Google Fonts -->
  <link href="https://fonts.googleapis.com/css2?family=Poppins:wght@400;600&display=swap" rel="stylesheet">
  <style>
    body {
      background: #f4f6f9;
      font-family: 'Poppins', sans-serif;
    }
    .container {
      margin-top: 40px;
      margin-bottom: 40px;
      animation: fadeInUp 0.8s ease-out;
    }
    @keyframes fadeInUp {
      from { opacity: 0; transform: translateY(30px); }
      to { opacity: 1; transform: translateY(0); }
    }
    .card {
      border: none;
      border-radius: 1rem;
      box-shadow: 0 8px 16px rgba(0,0,0,0.15);
      padding: 20px;
      margin-bottom: 20px;
    }
    .btn {
      transition: transform 0.2s ease, box-shadow 0.2s ease;
    }
    .btn:hover {
      transform: scale(1.02);
    }
  </style>
</head>
<body class="bg-light">
  <!-- Navbar -->
  <nav class="navbar navbar-expand-lg navbar-light bg-white shadow-sm mb-4">
    <div class="container d-flex justify-content-between align-items-center">
      <a href="dashboard.php" class="navbar-brand text-decoration-none">
        <img src="img/tarmel.jpg" alt="Ettevõtte logo" style="height:50px; margin-right:10px; border-radius:50%;">
        TarMel Ehitus
      </a>
      <div>
        <a href="logout.php" class="btn btn-danger">Logi välja</a>
      </div>
    </div>
  </nav>
  
  <div class="container">
    <h1 class="mb-4 text-center">Admin seadistused</h1>
    <form method="post" action="admin_settings.php">
      <div class="mb-3">
        <label for="check_in_deadline" class="form-label">Check-in tähtaeg (hh:mm:ss)</label>
        <input type="time" name="check_in_deadline" id="check_in_deadline" class="form-control" value="<?php echo htmlspecialchars($checkInDeadline); ?>" required>
      </div>
      <div class="mb-3">
        <label for="check_out_deadline" class="form-label">Check-out tähtaeg (hh:mm:ss)</label>
        <input type="time" name="check_out_deadline" id="check_out_deadline" class="form-control" value="<?php echo htmlspecialchars($checkOutDeadline); ?>" required>
      </div>
      <div class="mb-3">
        <label for="tolerance" class="form-label">Tolerants (meetrites)</label>
        <input type="number" name="tolerance" id="tolerance" class="form-control" value="<?php echo htmlspecialchars($tolerance); ?>" required>
      </div>
      <div class="mb-3">
        <label for="admin_email" class="form-label">Admin e-posti aadress</label>
        <input type="email" name="admin_email" id="admin_email" class="form-control" value="<?php echo htmlspecialchars($adminEmail); ?>" required>
      </div>
      <button type="submit" class="btn btn-primary w-100">Salvesta seaded</button>
    </form>
    <div class="text-center mt-3">
      <a href="dashboard.php" class="btn btn-outline-secondary">Tagasi Dashboardile</a>
    </div>
  </div>
  
  <!-- Footer -->
  <footer class="bg-white text-center py-3 shadow-sm">
    <div class="container">
      <small>&copy; <?php echo date("Y"); ?> TarMel Ehitus. Kõik õigused kaitstud.</small>
    </div>
  </footer>
  
  <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/js/bootstrap.bundle.min.js"></script>
</body>
</html>
