<?php
// admin_add_user.php
error_reporting(0);
ini_set('display_errors', '0');

session_start();
if (!isset($_SESSION['user_id']) || $_SESSION['role'] !== 'admin') {
    header('Location: login.php');
    exit;
}

require_once '../config/config.php';
$pdo = getDBConnection();

$error = '';
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $username    = trim($_POST['username'] ?? '');
    $password    = trim($_POST['password'] ?? '');
    $email       = trim($_POST['email'] ?? '');
    $hourly_rate = trim($_POST['hourly_rate'] ?? '');
    $advance     = trim($_POST['advance'] ?? '');
    $role        = trim($_POST['role'] ?? 'employee');

    if ($username === '' || $password === '' || $email === '' || $hourly_rate === '' || $advance === '') {
        $error = "Kõik väljad on kohustuslikud.";
    }
    
    // Parooli nõuded: vähemalt 12 tähemärki, vähemalt üks number ja üks sümbol
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
        $hashedPassword = password_hash($password, PASSWORD_DEFAULT);
        $stmt = $pdo->prepare("INSERT INTO users (username, password, email, hourly_rate, advance, role) VALUES (?, ?, ?, ?, ?, ?)");
        $stmt->execute([$username, $hashedPassword, $email, $hourly_rate, $advance, $role]);
        header('Location: admin_users.php?msg=added');
        exit;
    }
}
?>
<!DOCTYPE html>
<html lang="et">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Lisa uus kasutaja</title>
  <!-- Bootstrap 5 CSS -->
  <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet">
  <!-- Kohandatud stiilid -->
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
    .card {
      border: none;
      border-radius: 1rem;
      box-shadow: 0 4px 12px rgba(0,0,0,0.1);
    }
    .form-floating > label {
      transition: all 0.2s ease-out;
    }
    .form-floating > .form-control:focus ~ label,
    .form-floating > .form-control:not(:placeholder-shown) ~ label {
      transform: scale(0.85) translateY(-1.5rem);
      opacity: 0.75;
    }
  </style>
  <!-- Favicons -->
  <link rel="icon" type="image/png" href="/img/favicon-96x96.png" sizes="96x96" />
  <link rel="icon" type="image/svg+xml" href="/img/favicon.svg" />
  <link rel="shortcut icon" href="/img/favicon.ico" />
  <link rel="apple-touch-icon" sizes="180x180" href="/img/apple-touch-icon.png" />
  <meta name="apple-mobile-web-app-title" content="GretMar" />
  <link rel="manifest" href="/img/site.webmanifest" />
</head>
<body class="bg-light">
  <!-- Navigeerimisriba -->
  <nav class="navbar navbar-expand-lg navbar-light bg-white shadow-sm mb-4">
    <div class="container">
      <a class="navbar-brand" href="admin_users.php">
        <img src="img/tarmel.jpg" alt="Ettevõtte logo" style="height:50px; margin-right:10px;">
        TarMel Ehitus
      </a>
      <div class="d-flex">
        <a href="logout.php" class="btn btn-outline-secondary">Logi välja</a>
      </div>
    </div>
  </nav>
  
  <div class="container">
    <div class="card p-4">
      <h2 class="card-title text-center mb-4">Lisa uus kasutaja</h2>
      <?php if (!empty($error)): ?>
        <div class="alert alert-danger"><?php echo htmlspecialchars($error); ?></div>
      <?php endif; ?>
      <form method="post" action="admin_add_user.php">
        <div class="mb-3 form-floating">
          <input type="text" name="username" id="username" class="form-control" placeholder="Kasutajanimi" required>
          <label for="username">Kasutajanimi</label>
        </div>
        <div class="mb-3 form-floating">
          <input type="email" name="email" id="email" class="form-control" placeholder="E-mail" required>
          <label for="email">E-mail</label>
        </div>
        <div class="mb-3 form-floating">
          <input type="password" name="password" id="password" class="form-control" placeholder="Parool" required>
          <label for="password">Parool</label>
          <div class="form-text">
            Parool peab olema vähemalt 12 tähemärki, sisaldama ühte numbrit ja sümbolit.
          </div>
        </div>
        <div class="mb-3 form-floating">
          <input type="number" name="hourly_rate" id="hourly_rate" class="form-control" placeholder="Tunni hind (€)" step="0.01" required>
          <label for="hourly_rate">Tunni hind (€)</label>
        </div>
        <div class="mb-3 form-floating">
          <input type="number" name="advance" id="advance" class="form-control" placeholder="Avansi summa (€)" step="0.01" required>
          <label for="advance">Avansi summa (€)</label>
        </div>
        <div class="mb-3 form-floating">
          <select name="role" id="role" class="form-select">
            <option value="employee" selected>Töötaja</option>
            <option value="admin">Admin</option>
          </select>
          <label for="role">Roll</label>
        </div>
        <button type="submit" class="btn btn-primary w-100">Lisa kasutaja</button>
      </form>
      <div class="text-center mt-3">
        <a href="admin_users.php" class="btn btn-outline-secondary">Tagasi kasutajate haldamisse</a>
      </div>
    </div>
  </div>

  <!-- Jalus -->
  <footer class="bg-white text-center py-3 mt-auto shadow-sm">
    <div class="container">
      <small>&copy; <?php echo date("Y"); ?> GretMar. Kõik õigused kaitstud.</small>
    </div>
  </footer>
  
  <!-- Bootstrap JS Bundle -->
  <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/js/bootstrap.bundle.min.js"></script>
</body>
</html>
