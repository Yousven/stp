<?php
session_start();
if (!isset($_SESSION['user_id'])) {
  header('Location: login.php');
  exit;
}
require_once '../config/config.php';
$pdo = getDBConnection();
$user_id = $_SESSION['user_id'];

// Otsi aktiivset töölogi (end_time IS NULL)
$stmt = $pdo->prepare("SELECT * FROM time_logs WHERE user_id = ? AND end_time IS NULL ORDER BY start_time DESC LIMIT 1");
$stmt->execute([$user_id]);
$activeLog = $stmt->fetch(PDO::FETCH_ASSOC);

// Kui aktiivset töölogi ei leidu, salvame teate muutujasse
$errorMessage = "";
if (!$activeLog) {
  $errorMessage = "Aktivset töölogi ei leitud. Tööpäev pole alustatud või on juba lõpetatud.";
}
?>
<!DOCTYPE html>
<html lang="et">

<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Lõpeta tööpäev</title>
  <!-- Bootstrap 5 CSS -->
  <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet">
  <!-- Google Fonts -->
  <link href="https://fonts.googleapis.com/css2?family=Poppins:wght@400;600&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="style.css">
  <style>
    body {
      background: linear-gradient(135deg, #ece9e6, #ffffff);
      font-family: 'Poppins', sans-serif;
      min-height: 100vh;
      display: flex;
      flex-direction: column;
    }

    .container {
      animation: fadeIn 1s ease-in-out;
      margin-top: 20px;
      margin-bottom: 20px;
    }

    footer {
      position: fixed;
      bottom: 0;
      left: 0;
      width: 100%;
      background: #fff;
      padding: 1rem 0;
      text-align: center;
      box-shadow: 0 -2px 6px rgba(0, 0, 0, 0.1);
      z-index: 999;
      /* et olla eespool muudest elementidest */
    }


    @keyframes fadeIn {
      from {
        opacity: 0;
        transform: translateY(10px);
      }

      to {
        opacity: 1;
        transform: translateY(0);
      }
    }

    /* Loader overlay, vajadusel */
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
  </style>
</head>

<body class="bg-light">
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
    <?php if ($errorMessage): ?>
      <!-- Kui aktiivset töölogi ei leidu, ei kuva vormi, vaid käivitatakse error modal -->
      <script>
        document.addEventListener("DOMContentLoaded", function () {
          var errorModal = new bootstrap.Modal(document.getElementById('errorModal'));
          errorModal.show();
        });
      </script>
    <?php else: ?>
      <div class="card shadow-sm">
        <div class="card-header bg-warning text-white">
          <h2 class="card-title mb-0">Lõpeta tööpäev</h2>
        </div>
        <div class="card-body">
          <form id="endWorkForm" action="end_work_action.php" method="post">
            <input type="hidden" name="log_id" value="<?php echo $activeLog['id']; ?>">
            <!-- Salvestame töö alguse aja arvutuste jaoks -->
            <input type="hidden" id="startTime" value="<?php echo $activeLog['start_time']; ?>">

            <div class="mb-3">
              <label for="comment" class="form-label">Kommentaar tehtud töö kohta:</label>
              <textarea name="comment" id="comment" class="form-control" rows="4" placeholder="Sisesta kommentaar..."
                data-bs-toggle="tooltip" title="Vabatahtlik kommentaar"></textarea>
            </div>

            <div class="mb-3">
              <label for="travel_duration" class="form-label">Sõidu kestus (tunnid):</label>
              <input type="number" name="travel_duration" id="travel_duration" class="form-control" step="0.01"
                placeholder="Näiteks 0.50" data-bs-toggle="tooltip" title="Sisesta sõidule kulunud aeg">
            </div>

            <div class="mb-3">
              <label for="lunch" class="form-label">Lõuna kestus (tunnid):</label>
              <input type="number" name="lunch" id="lunch" class="form-control" step="0.01" placeholder="Näiteks 0.50"
                data-bs-toggle="tooltip" title="Sisesta lõunapausi kestus">
            </div>

            <!-- Nupp, mis käivitab kinnituse modal popup'i -->
            <button type="button" id="endWorkButton" class="btn btn-warning w-100">Lõpeta tööpäev</button>
          </form>

          <!-- Kuvatakse kasutaja poolt sisestatud ning arvutatud tööaja info -->
          <div class="mt-3">
            <p>
              Hetkel tööd tehtud:
              Brutotunnid: <span id="grossTime">0.00</span> tundi,
              Lõuna: <span id="lunchTimeDisplay">0.00</span> tundi,
              Sõidu aeg: <span id="travelTimeDisplay">0.00</span> tundi,
              Netotunnid: <span id="netTime">0.00</span> tundi.
            </p>
          </div>
        </div>
      </div>
    <?php endif; ?>
    <a href="dashboard.php" class="btn btn-link mt-3">Tagasi Dashboardile</a>
  </div>

  <!-- Error Modal (kuvatakse, kui aktiivset töölogi ei leidu) -->
  <div class="modal fade" id="errorModal" tabindex="-1" aria-labelledby="errorModalLabel" aria-hidden="true">
    <div class="modal-dialog">
      <div class="modal-content">
        <div class="modal-header">
          <h5 class="modal-title" id="errorModalLabel">Teade</h5>
          <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Sulge"></button>
        </div>
        <div class="modal-body">
          <?php echo htmlspecialchars($errorMessage); ?>
        </div>
        <div class="modal-footer">
          <a href="dashboard.php" class="btn btn-secondary">Tagasi Dashboardile</a>
        </div>
      </div>
    </div>
  </div>

  <!-- Kinnituse Modal popup tööpäeva lõpetamiseks -->
  <div class="modal fade" id="confirmModal" tabindex="-1" aria-labelledby="confirmModalLabel" aria-hidden="true">
    <div class="modal-dialog">
      <div class="modal-content">
        <div class="modal-header">
          <h5 class="modal-title" id="confirmModalLabel">Kinnita tööpäeva lõpetamine</h5>
          <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Sulge"></button>
        </div>
        <div class="modal-body">
          <p>Kas soovid lõpetada tööpäeva?</p>
          <p>
            Brutotunnid: <span id="modalGrossTime">0.00</span> tundi<br>
            Lõuna: <span id="modalLunchTime">0.00</span> tundi<br>
            Netotunnid: <span id="modalNetTime">0.00</span> tundi
          </p>
          <p class="text-muted"><small>Veendu, et kõik andmed on korrektsed, enne kui kinnitad tööpäeva
              lõpetamist.</small></p>
        </div>
        <div class="modal-footer">
          <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Tühista</button>
          <button type="button" id="confirmSubmit" class="btn btn-warning">Kinnita</button>
        </div>
      </div>
    </div>
  </div>

  <!-- Loader overlay (näidatakse vajadusel) -->
  <div id="loadingOverlay">
    <div class="spinner-border text-warning" role="status">
      <span class="visually-hidden">Laadimine...</span>
    </div>
  </div>

  <!-- Bootstrap 5 JS Bundle -->
  <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/js/bootstrap.bundle.min.js"></script>
  <script>
    // Aktiveeri tooltipid
    var tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'));
    tooltipTriggerList.forEach(function (tooltipTriggerEl) {
      new bootstrap.Tooltip(tooltipTriggerEl);
    });

    // Funktsioon, mis uuendab tööaja kalkulatsiooni
    function updateWorkTime() {
      var startTimeStr = document.getElementById("startTime").value;
      var startTime = new Date(startTimeStr.replace(" ", "T"));
      var now = new Date();

      // Arvuta brutotunnid
      var diffMs = now - startTime;
      var grossHours = diffMs / (1000 * 60 * 60);
      grossHours = Math.max(grossHours, 0);
      var grossRounded = parseFloat(grossHours.toFixed(2));

      // Lõuna ja sõidu aja väärtused
      var lunchVal = parseFloat(document.getElementById("lunch").value) || 0;
      var travelVal = parseFloat(document.getElementById("travel_duration").value) || 0;

      // Arvuta netotunnid (brutotunnid miinus lõuna)
      var netHours = grossHours - lunchVal;
      netHours = netHours < 0 ? 0 : netHours;
      var netRounded = parseFloat(netHours.toFixed(2));

      // Uuenda DOM-i
      document.getElementById("grossTime").textContent = grossRounded.toFixed(2);
      document.getElementById("lunchTimeDisplay").textContent = lunchVal.toFixed(2);
      document.getElementById("travelTimeDisplay").textContent = travelVal.toFixed(2);
      document.getElementById("netTime").textContent = netRounded.toFixed(2);

      // Uuenda ka modaalaknas näidatavad väärtused
      document.getElementById("modalGrossTime").textContent = grossRounded.toFixed(2);
      document.getElementById("modalLunchTime").textContent = lunchVal.toFixed(2);
      document.getElementById("modalNetTime").textContent = netRounded.toFixed(2);
    }

    // Uuenda tööaja info hetke alusel (kuni kasutaja vajutab nuppu)
    updateWorkTime();
    // Kasutaja võib muuta sisendvälju – lisame event listenerid
    document.getElementById("lunch").addEventListener("input", updateWorkTime);
    document.getElementById("travel_duration").addEventListener("input", updateWorkTime);

    // Kinnituse modaalakna käitlemine
    document.getElementById("endWorkButton").addEventListener("click", function () {
      // Uuenda tööaja info enne modal'i avamist
      updateWorkTime();
      var confirmModal = new bootstrap.Modal(document.getElementById('confirmModal'));
      confirmModal.show();
    });

    // Kui kasutaja kinnitab modal'is, esita vorm ja kuva laadimisindikaator
    document.getElementById("confirmSubmit").addEventListener("click", function () {
      document.getElementById('loadingOverlay').style.display = 'flex';
      document.getElementById("endWorkForm").submit();
    });
  </script>
</body>
<footer>
  <div class="container">
    <small>&copy; <?php echo date("Y"); ?> GretMar. Kõik õigused kaitstud.</small>
  </div>
</footer>

</html>