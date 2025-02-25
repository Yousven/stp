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

// Kontrollime, kas GET parameeter 'id' on olemas
if (!isset($_GET['id'])) {
    die("Kasutaja ID puudub.");
}

$id = $_GET['id'];

// Laeme kasutaja andmed andmebaasist (nüüd ka email)
$stmt = $pdo->prepare("SELECT * FROM users WHERE id = ?");
$stmt->execute([$id]);
$user = $stmt->fetch(PDO::FETCH_ASSOC);

if (!$user) {
    die("Kasutajat ei leitud.");
}

// Kui vorm on esitatud, uuendame kasutaja andmeid
if ($_SERVER['REQUEST_METHOD'] === "POST") {
    $username    = trim($_POST['username'] ?? '');
    $email       = trim($_POST['email'] ?? '');
    $hourly_rate = trim($_POST['hourly_rate'] ?? '');
    $advance     = trim($_POST['advance'] ?? '');
    $role        = trim($_POST['role'] ?? '');
    $password    = trim($_POST['password'] ?? ''); // parool, kui soovitakse muuta

    if ($username === '' || $email === '' || $hourly_rate === '' || $advance === '' || $role === '') {
        $error = "Kõik väljad on kohustuslikud (välja arvatud parool, mida võid jätta tühjaks, kui ei soovi seda muuta).";
    } else {
        if (!empty($password)) {
            $hashedPassword = password_hash($password, PASSWORD_DEFAULT);
            $stmt = $pdo->prepare("UPDATE users SET username = ?, email = ?, hourly_rate = ?, advance = ?, role = ?, password = ? WHERE id = ?");
            $stmt->execute([$username, $email, $hourly_rate, $advance, $role, $hashedPassword, $id]);
        } else {
            $stmt = $pdo->prepare("UPDATE users SET username = ?, email = ?, hourly_rate = ?, advance = ?, role = ? WHERE id = ?");
            $stmt->execute([$username, $email, $hourly_rate, $advance, $role, $id]);
        }
        header("Location: admin_users.php");
        exit;
    }
}
?>
<!DOCTYPE html>
<html lang="et">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Muuda kasutajat</title>
  <!-- Bootstrap 5 CSS -->
  <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet">
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
    footer {
      background: #fff;
      padding: 1rem 0;
      text-align: center;
      margin-top: auto;
      box-shadow: 0 -2px 6px rgba(0,0,0,0.1);
    }
  </style>
  <!-- Favicons -->
  <link rel="icon" type="image/png" href="/img/favicon-96x96.png" sizes="96x96">
  <link rel="icon" type="image/svg+xml" href="/img/favicon.svg">
  <link rel="shortcut icon" href="/img/favicon.ico">
  <link rel="apple-touch-icon" sizes="180x180" href="/img/apple-touch-icon.png">
  <meta name="apple-mobile-web-app-title" content="GretMar">
  <link rel="manifest" href="/img/site.webmanifest">
</head>
<body class="bg-light">
  <!-- Navbar -->
  <nav class="navbar navbar-expand-lg navbar-light bg-white shadow-sm mb-4">
    <div class="container">
      <a class="navbar-brand" href="admin_dashboard.php">
        <img src="img/tarmel.jpg" alt="Ettevõtte logo" style="height:50px; margin-right:10px;">
        TarMel Ehitus
      </a>
      <div class="d-flex">
        <a href="logout.php" class="btn btn-danger">Logi välja</a>
      </div>
    </div>
  </nav>
  
  <!-- Peamine sisu -->
  <div class="container">
    <div class="card p-4">
      <h2 class="card-title text-center mb-4">Muuda kasutajat</h2>
      <?php if (isset($error)): ?>
        <div class="alert alert-danger"><?php echo htmlspecialchars($error); ?></div>
      <?php endif; ?>
      <form method="post" action="admin_edit_user.php?id=<?php echo htmlspecialchars($id); ?>">
        <div class="mb-3">
          <label for="username" class="form-label">Kasutajanimi</label>
          <input type="text" name="username" id="username" class="form-control" value="<?php echo htmlspecialchars($user['username']); ?>" required>
        </div>
        <div class="mb-3">
          <label for="email" class="form-label">E-mail</label>
          <input type="email" name="email" id="email" class="form-control" value="<?php echo htmlspecialchars($user['email']); ?>" required>
        </div>
        <div class="mb-3">
          <label for="hourly_rate" class="form-label">Tunni hind (€)</label>
          <input type="number" name="hourly_rate" id="hourly_rate" class="form-control" step="0.01" value="<?php echo htmlspecialchars($user['hourly_rate']); ?>" required>
        </div>
        <div class="mb-3">
          <label for="advance" class="form-label">Avansi summa (€)</label>
          <input type="number" name="advance" id="advance" class="form-control" step="0.01" value="<?php echo htmlspecialchars($user['advance']); ?>" required>
        </div>
        <div class="mb-3">
          <label for="role" class="form-label">Roll</label>
          <select name="role" id="role" class="form-select" required>
            <option value="employee" <?php if($user['role'] === 'employee') echo "selected"; ?>>Töötaja</option>
            <option value="admin" <?php if($user['role'] === 'admin') echo "selected"; ?>>Admin</option>
          </select>
        </div>
        <div class="mb-3">
          <label for="password" class="form-label">Uus parool (jätta tühjaks, kui ei soovi muuta)</label>
          <input type="password" name="password" id="password" class="form-control">
        </div>
        <button type="submit" class="btn btn-primary">Salvesta muudatused</button>
        <a href="admin_users.php" class="btn btn-outline-secondary">Tagasi kasutajate haldamisse</a>
      </form>
    </div>
  </div>
  
  <!-- Jalus -->
  <footer>
    <div class="container">
      <small>&copy; <?php echo date("Y"); ?> GretMar. Kõik õigused kaitstud.</small>
    </div>
  </footer>
  
  <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/js/bootstrap.bundle.min.js"></script>
</body>
</html>
