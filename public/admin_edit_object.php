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
    die("Objekti ID puudub.");
}

$id = $_GET['id'];

// Laeme objekti andmed andmebaasist
$stmt = $pdo->prepare("SELECT * FROM objects WHERE id = ?");
$stmt->execute([$id]);
$object = $stmt->fetch(PDO::FETCH_ASSOC);

if (!$object) {
    die("Objekti andmeid ei leitud.");
}

// Kui vorm on esitatud, uuendame objekti andmeid
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $name = trim($_POST['name'] ?? '');
    $description = trim($_POST['description'] ?? '');
    $latitude = trim($_POST['latitude'] ?? '');
    $longitude = trim($_POST['longitude'] ?? '');
    $radius = trim($_POST['radius'] ?? '');

    if ($name === '' || $latitude === '' || $longitude === '' || $radius === '') {
        $error = "Kõik kohustuslikud väljad peavad olema täidetud.";
    } else {
        $stmt = $pdo->prepare("UPDATE objects SET name = ?, description = ?, latitude = ?, longitude = ?, radius = ? WHERE id = ?");
        $stmt->execute([$name, $description, $latitude, $longitude, $radius, $id]);
        header("Location: admin_objects.php");
        exit;
    }
}
?>
<!DOCTYPE html>
<html lang="et">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Muuda objekti</title>
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
      <a class="navbar-brand" href="admin_objects.php">
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
      <h2 class="card-title text-center mb-4">Muuda objekti</h2>
      <?php if (isset($error)): ?>
        <div class="alert alert-danger"><?php echo htmlspecialchars($error); ?></div>
      <?php endif; ?>
      <form method="post" action="admin_edit_object.php?id=<?php echo htmlspecialchars($id); ?>">
        <div class="mb-3">
          <label for="name" class="form-label">Objekti nimi</label>
          <input type="text" name="name" id="name" class="form-control" value="<?php echo htmlspecialchars($object['name']); ?>" required>
        </div>
        <div class="mb-3">
          <label for="description" class="form-label">Kirjeldus</label>
          <textarea name="description" id="description" class="form-control"><?php echo htmlspecialchars($object['description']); ?></textarea>
        </div>
        <div class="mb-3">
          <label for="latitude" class="form-label">Latitude</label>
          <input type="text" name="latitude" id="latitude" class="form-control" value="<?php echo htmlspecialchars($object['latitude']); ?>" required>
        </div>
        <div class="mb-3">
          <label for="longitude" class="form-label">Longitude</label>
          <input type="text" name="longitude" id="longitude" class="form-control" value="<?php echo htmlspecialchars($object['longitude']); ?>" required>
        </div>
        <div class="mb-3">
          <label for="radius" class="form-label">Lubatud raadius (m)</label>
          <input type="number" name="radius" id="radius" class="form-control" value="<?php echo htmlspecialchars($object['radius']); ?>" required>
        </div>
        <button type="submit" class="btn btn-primary">Salvesta muudatused</button>
        <a href="admin_objects.php" class="btn btn-outline-secondary">Tagasi objektide haldamisse</a>
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
