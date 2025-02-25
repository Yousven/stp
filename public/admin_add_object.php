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

$error = '';
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $name = trim($_POST['name'] ?? '');
    $description = trim($_POST['description'] ?? '');
    $address = trim($_POST['address'] ?? '');
    $latitude = trim($_POST['latitude'] ?? '');
    $longitude = trim($_POST['longitude'] ?? '');
    $radius = trim($_POST['radius'] ?? '');

    if ($name === '' || $latitude === '' || $longitude === '' || $radius === '') {
        $error = "Kõik kohustuslikud väljad peavad olema täidetud.";
    } else {
        $stmt = $pdo->prepare("INSERT INTO objects (name, description, address, latitude, longitude, radius) VALUES (?, ?, ?, ?, ?, ?)");
        $stmt->execute([$name, $description, $address, $latitude, $longitude, $radius]);
        header('Location: admin_objects.php?msg=added');
        exit;
    }
}
?>
<!DOCTYPE html>
<html lang="et">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Lisa uus objekt</title>
  <!-- Bootstrap 5 CSS -->
  <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet">
  <!-- Lehe stiil -->
  <link rel="stylesheet" href="style.css">
  <!-- Favicons ja muu meta info -->
  <link rel="icon" type="image/png" href="/img/favicon-96x96.png" sizes="96x96" />
  <link rel="icon" type="image/svg+xml" href="/img/favicon.svg" />
  <link rel="shortcut icon" href="/img/favicon.ico" />
  <link rel="apple-touch-icon" sizes="180x180" href="/img/apple-touch-icon.png" />
  <meta name="apple-mobile-web-app-title" content="GretMar" />
  <link rel="manifest" href="/img/site.webmanifest" />
  <style>
    /* Üldine fade-in animatsioon */
    .container {
      animation: fadeIn 1s ease-in-out;
    }
    @keyframes fadeIn {
      from { opacity: 0; transform: translateY(10px); }
      to { opacity: 1; transform: translateY(0); }
    }
    /* Kaardipõhine vorm ja varjud */
    .card {
      border: none;
      border-radius: 1rem;
      box-shadow: 0 4px 12px rgba(0,0,0,0.1);
      margin-bottom: 20px;
    }
    /* Aadressisoovituste stiil */
    .suggestions {
      position: absolute;
      top: 100%;
      left: 0;
      right: 0;
      z-index: 1000;
      background: #fff;
      border: 1px solid #ccc;
      border-top: none;
      max-height: 200px;
      overflow-y: auto;
    }
    .suggestion-item {
      padding: 8px 12px;
      cursor: pointer;
    }
    .suggestion-item:hover {
      background: #f1f1f1;
    }
  </style>
  <script>
    // Funktsioon aadressi soovituste saamiseks Nominatim API kaudu
    async function fetchAddressSuggestions(query) {
      const url = `https://nominatim.openstreetmap.org/search?format=json&addressdetails=1&countrycodes=ee&q=${encodeURIComponent(query)}`;
      try {
        const response = await fetch(url);
        if (!response.ok) {
          console.error('Nominatim API error');
          return [];
        }
        const data = await response.json();
        return data;
      } catch (error) {
        console.error('Fetch error:', error);
        return [];
      }
    }

    // Kuvab soovitused sisestusvälja all
    async function showSuggestions() {
      const input = document.getElementById('address');
      const query = input.value;
      const suggestionsContainer = document.getElementById('suggestions');
      suggestionsContainer.innerHTML = ''; // tühjenda varasemad soovitused
      if (!query) return;
      const suggestions = await fetchAddressSuggestions(query);
      suggestions.forEach(item => {
        const div = document.createElement('div');
        div.classList.add('suggestion-item');
        div.textContent = item.display_name;
        div.addEventListener('click', () => {
          // Täida aadress, latitude ja longitude väljad
          input.value = item.display_name;
          document.getElementById('latitude').value = item.lat;
          document.getElementById('longitude').value = item.lon;
          suggestionsContainer.innerHTML = '';
        });
        suggestionsContainer.appendChild(div);
      });
    }
  </script>
</head>
<body class="bg-light">
  <!-- Navigeerimisriba (vajadusel lisada ka ühtne header) -->
  <nav class="navbar navbar-expand-lg navbar-light bg-white shadow-sm mb-4">
    <div class="container">
      <a class="navbar-brand" href="admin_objects.php">
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
      <h2 class="card-title text-center mb-4">Lisa uus objekt</h2>
      <?php if (!empty($error)): ?>
        <div class="alert alert-danger"><?php echo htmlspecialchars($error); ?></div>
      <?php endif; ?>
      <form method="post" action="admin_add_object.php">
        <div class="mb-3 form-floating">
          <input type="text" name="name" id="name" class="form-control" placeholder="Objekti nimi" required>
          <label for="name">Objekti nimi</label>
        </div>
        <div class="mb-3 form-floating">
          <textarea name="description" id="description" class="form-control" placeholder="Kirjeldus" style="height: 100px;"></textarea>
          <label for="description">Kirjeldus</label>
        </div>
        <div class="mb-3 form-floating position-relative">
          <input type="text" name="address" id="address" class="form-control" placeholder="Aadress" onkeyup="showSuggestions()">
          <label for="address">Aadress</label>
          <!-- Soovitused kuvatakse siin -->
          <div id="suggestions" class="suggestions"></div>
        </div>
        <div class="mb-3 form-floating">
          <input type="text" name="latitude" id="latitude" class="form-control" placeholder="Latitude">
          <label for="latitude">Latitude</label>
        </div>
        <div class="mb-3 form-floating">
          <input type="text" name="longitude" id="longitude" class="form-control" placeholder="Longitude">
          <label for="longitude">Longitude</label>
        </div>
        <div class="mb-3 form-floating">
          <input type="number" name="radius" id="radius" class="form-control" placeholder="Lubatud raadius (m)" required>
          <label for="radius">Lubatud raadius (m)</label>
        </div>
        <button type="submit" class="btn btn-primary w-100">Lisa objekt</button>
      </form>
      <div class="text-center mt-3">
        <a href="admin_objects.php" class="btn btn-outline-secondary">Tagasi objektide haldamisse</a>
      </div>
    </div>
  </div>

  <!-- Bootstrap JS Bundle -->
  <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/js/bootstrap.bundle.min.js"></script>
</body>
</html>
