<?php
// public/start_work_action.php
session_start();
if (!isset($_SESSION['user_id'])) {
    header('Location: login.php');
    exit;
}

require_once '../config/config.php';
$pdo = getDBConnection();

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    header('Location: start_work.php');
    exit;
}

$user_id   = $_SESSION['user_id'];
$object_id = trim($_POST['object_id'] ?? '');

if ($object_id === '') {
    http_response_code(400);
    die("Kõik väljad peavad olema täidetud.");
}

try {
    // Kontrolli, et valitud objekt eksisteerib
    $stmt = $pdo->prepare("SELECT * FROM objects WHERE id = ?");
    $stmt->execute([$object_id]);
    $object = $stmt->fetch(PDO::FETCH_ASSOC);
    if (!$object) {
        http_response_code(404);
        die("Valitud objekti ei leitud.");
    }
    
    // Kontrolli, kas kasutajal on juba aktiivne töölogi (end_time IS NULL)
    $stmt = $pdo->prepare("SELECT id FROM time_logs WHERE user_id = ? AND end_time IS NULL");
    $stmt->execute([$user_id]);
    $active_log = $stmt->fetch(PDO::FETCH_ASSOC);
    if ($active_log) {
        // Kui aktiivne töölogi eksisteerib, kuvame mobiilisõbraliku ja modernse Bootstrap modal popup'i
        ?>
<!DOCTYPE html>
<html lang="et">
<head>
    <meta charset="UTF-8">
    <!-- Mobiilseadmete jaoks vajalik viewport seade -->
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Tööpäeva alustamine</title>
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.2.3/dist/css/bootstrap.min.css" rel="stylesheet">
    <style>
      body {
         background: linear-gradient(135deg, #74ebd5 0%, #ACB6E5 100%);
         font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
         min-height: 100vh;
         display: flex;
         align-items: center;
         justify-content: center;
         margin: 0;
         padding: 1rem;
      }
      .modal-content {
         border-radius: 12px;
         box-shadow: 0 4px 15px rgba(0, 0, 0, 0.3);
      }
      .modal-header {
         background-color: #4e73df;
         color: white;
         border-top-left-radius: 12px;
         border-top-right-radius: 12px;
      }
      .btn-primary {
         background-color: #4e73df;
         border: none;
      }
    </style>
</head>
<body>
    <!-- Bootstrap Modal -->
    <div class="modal fade" id="activeWorkModal" tabindex="-1" aria-labelledby="activeWorkModalLabel" aria-hidden="true">
      <div class="modal-dialog modal-dialog-centered">
        <div class="modal-content">
          <div class="modal-header">
            <h5 class="modal-title" id="activeWorkModalLabel">Tööpäev juba alustatud</h5>
            <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Sulge"></button>
          </div>
          <div class="modal-body">
            <p class="mb-0">Tööpäev on juba alustatud. Palun lõpetage olemasolev tööpäev enne uue alustamist.</p>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-primary" onclick="redirectBack()">Tagasi</button>
          </div>
        </div>
      </div>
    </div>
    
    <script>
      function redirectBack() {
          window.location.href = "dashboard.php";
      }
      document.addEventListener("DOMContentLoaded", function(){
         var activeWorkModal = new bootstrap.Modal(document.getElementById('activeWorkModal'));
         activeWorkModal.show();
      });
    </script>
    <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.2.3/dist/js/bootstrap.bundle.min.js"></script>
</body>
</html>
<?php
        exit;
    }
    
    // Kui aktiivset töölogi ei leita, alustame uut tööpäeva
    // Kasutame vaikimisi koordinaate 0 (geolokatsiooni osa eemaldatud)
    $lat = 0;
    $lon = 0;
    
    $stmt = $pdo->prepare("INSERT INTO time_logs (user_id, object_id, start_time, start_latitude, start_longitude) VALUES (?, ?, NOW(), ?, ?)");
    $stmt->execute([$user_id, $object_id, $lat, $lon]);
    
    header('Location: dashboard.php');
    exit;
} catch (Exception $e) {
    error_log("Start work action error: " . $e->getMessage());
    http_response_code(500);
    die("Viga töö alguses. Palun proovi hiljem uuesti.");
}
?>
