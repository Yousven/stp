<?php
session_start();
if (!isset($_SESSION['user_id'])) {
  header('Location: login.php');
  exit;
}
require_once '../config/config.php';
$pdo = getDBConnection();

// Laeme kõik objektid, et kuvada loendina
$stmt = $pdo->query("SELECT id, name, latitude, longitude, radius FROM objects WHERE deleted = 0 ORDER BY name");
$objects = $stmt->fetchAll(PDO::FETCH_ASSOC);
?>
<!DOCTYPE html>
<html lang="et">

<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Alusta tööpäeva</title>
  <!-- Bootstrap 5 CSS -->
  <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet">
  <!-- Google Fonts (valikuline) -->
  <link href="https://fonts.googleapis.com/css2?family=Poppins:wght@400;600&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="style.css">
  <style>
    body {
      background-color: #f8f9fa;
      font-family: 'Poppins', sans-serif;
    }

    /* Loader overlay stiil */
    #loadingOverlay {
      display: none;
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(255, 255, 255, 0.8);
      z-index: 1100;
      align-items: center;
      justify-content: center;
    }

    .container {
      animation: fadeIn 1s ease-in-out;
      margin-top: 20px;
      margin-bottom: 20px;
    }

    .navbar {
      background: linear-gradient(135deg, #f8f9fa, #e9ecef);
      padding: 4px 0;
      /* Väga väike padding, et navbar oleks madalam */
      border-radius: 6px;
      min-height: 45px;
      /* Seab navbar-i minimaalset kõrgust */
      transition: all 0.3s ease-in-out;
    }

    .navbar-brand {
      font-weight: bold;
      font-size: 1.2rem;
      color: #333;
      display: flex;
      align-items: center;
      text-decoration: none;
    }

    .navbar-brand img {
      border-radius: 5px;
      height: 35px;
      /* Veel väiksem logo */
      margin-right: 6px;
      transition: transform 0.3s ease-in-out;
    }

    .navbar-brand:hover img {
      transform: scale(1.05);
    }

    .navbar .btn-danger {
      font-weight: bold;
      border-radius: 15px;
      padding: 4px 12px;
      /* Väiksem padding, et nupp oleks väiksem */
      font-size: 13px;
      box-shadow: 0px 2px 4px rgba(255, 0, 0, 0.2);
      transition: all 0.3s ease-in-out;
    }

    .navbar .btn-danger:hover {
      background-color: #d9534f;
      transform: translateY(-1px);
    }

    .navbar .container {
      display: flex;
      justify-content: space-between;
      align-items: center;
      height: 45px;
      /* Vähendatud kõrgus */
    }


    footer {
      position: fixed;
      bottom: 0;
      left: 0;
      width: 100%;
      background: linear-gradient(135deg, #f8f9fa, #e9ecef);
      /* Pehme gradientne taust */
      padding: 10px 0;
      /* Kitsam padding */
      text-align: center;
      box-shadow: 0 -2px 6px rgba(0, 0, 0, 0.1);
      font-size: 14px;
      font-weight: 500;
      color: #333;
      z-index: 999;
      transition: all 0.3s ease-in-out;
    }

    footer:hover {
      background: linear-gradient(135deg, #e9ecef, #dee2e6);
      /* Hoveril natuke tumedam */
    }

    footer small {
      display: block;
      transition: transform 0.3s ease-in-out, color 0.3s ease-in-out;
    }

    footer small:hover {
      transform: scale(1.05);
      color: #007bff;
      /* Hoveril muudab värvi siniseks */
    }
  </style>
</head>

<body>
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
  <div class="container py-4">
    <h1 class="mb-4">Alusta tööpäeva</h1>
    <form id="startWorkForm" action="start_work_action.php" method="post">
      <div class="mb-3">
        <label for="object_id" class="form-label">Vali objekt:</label>
        <select name="object_id" id="object_id" class="form-select" required>
          <option value="">-- Vali objekt --</option>
          <?php foreach ($objects as $obj): ?>
            <option value="<?php echo $obj['id']; ?>" data-lat="<?php echo $obj['latitude']; ?>"
              data-lon="<?php echo $obj['longitude']; ?>" data-radius="<?php echo $obj['radius']; ?>">
              <?php echo htmlspecialchars($obj['name']); ?>
            </option>
          <?php endforeach; ?>
        </select>
      </div>
      <!-- Varjatud väljad kasutaja asukoha jaoks -->
      <input type="hidden" name="latitude" id="latitude" value="">
      <input type="hidden" name="longitude" id="longitude" value="">

      <div class="d-flex gap-3">
        <button type="button" id="startButton" class="btn btn-primary">Alusta tööpäeva</button>
        <a href="dashboard.php" class="btn btn-secondary">Tagasi Dashboardile</a>
      </div>
    </form>
  </div>

  <!-- Laadimisindikaatori overlay -->
  <div id="loadingOverlay">
    <div class="spinner-border text-primary" role="status">
      <span class="visually-hidden">Laadimine...</span>
    </div>
  </div>

  <!-- Bootstrap Modaal akna markup -->
  <div class="modal fade" id="errorModal" tabindex="-1" aria-labelledby="errorModalLabel" aria-hidden="true">
    <div class="modal-dialog">
      <div class="modal-content">
        <div class="modal-header">
          <h5 class="modal-title" id="errorModalLabel">Teade</h5>
          <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Sulge"></button>
        </div>
        <div class="modal-body">
          <p id="modalMessage"></p>
        </div>
        <div class="modal-footer">
          <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Sulge</button>
        </div>
      </div>
    </div>
  </div>

  <!-- Bootstrap 5 JS Bundle -->
  <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/js/bootstrap.bundle.min.js"></script>
  <script>
    // Näita laadimisindikaatorit
    function showLoader() {
      document.getElementById('loadingOverlay').style.display = 'flex';
    }
    // Peida laadimisindikaator
    function hideLoader() {
      document.getElementById('loadingOverlay').style.display = 'none';
    }

    function toRadians(degrees) {
      return degrees * Math.PI / 180;
    }

    function startWork() {
      var select = document.getElementById('object_id');
      var selectedOption = select.options[select.selectedIndex];
      if (!selectedOption.value) {
        showModal("Palun vali objekt enne tööpäeva alustamist.");
        return;
      }

      // Võtame valitud objekti andmed
      var objectLat = parseFloat(selectedOption.getAttribute('data-lat'));
      var objectLon = parseFloat(selectedOption.getAttribute('data-lon'));
      var objectRadius = parseFloat(selectedOption.getAttribute('data-radius'));

      if (navigator.geolocation) {
        showLoader();
        navigator.geolocation.getCurrentPosition(
          function (position) {
            var userLat = position.coords.latitude;
            var userLon = position.coords.longitude;
            var R = 6371000; // Maa raadius meetrites
            var dLat = toRadians(objectLat - userLat);
            var dLon = toRadians(objectLon - userLon);
            var a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(toRadians(userLat)) * Math.cos(toRadians(objectLat)) *
              Math.sin(dLon / 2) * Math.sin(dLon / 2);
            var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
            var distance = R * c; // kaugus meetrites

            if (distance <= objectRadius) {
              // Kui asud lubatud raadiuses, täidame varjatud väljad ja esitame vormi
              document.getElementById("latitude").value = userLat;
              document.getElementById("longitude").value = userLon;
              document.getElementById("startWorkForm").submit();
            } else {
              hideLoader();
              showModal("Oled liiga kaugel objektist! Sinu kaugus: " + Math.round(distance) + " m, lubatud: " + objectRadius + " m.");
            }
          },
          function (error) {
            hideLoader();
            console.error("Geolokatsiooni viga:", error);
            if (error.code === error.POSITION_UNAVAILABLE) {
              showModal("Sinu brauser ei luba ligipääsu asukohale. Kontrolli oma asukohaseadeid.");
            } else {
              showModal("Geolokatsiooni viga (code " + error.code + "): " + error.message);
            }
          },
          { timeout: 10000 } // 10 sekundi timeout geolokatsiooni päringule
        );
      } else {
        showModal("Teie brauser ei toeta geolokatsiooni.");
      }
    }

    // Funktsioon modaalse teate kuvamiseks
    function showModal(message) {
      document.getElementById("modalMessage").textContent = message;
      var myModal = new bootstrap.Modal(document.getElementById('errorModal'));
      myModal.show();
    }

    // Lisa sündmuse kuulaja nupule
    document.getElementById('startButton').addEventListener('click', startWork);
  </script>
</body>
<footer>
  <div class="container">
    <small>&copy; <?php echo date("Y"); ?> GretMar. Kõik õigused kaitstud.</small>
  </div>
</footer>

</html>