<?php
error_reporting(E_ALL);
ini_set('display_errors', 1);
session_start();

// Kontrollime, kas sessioonis on vajalikud andmed ja kas roll on kas "admin" või "employee"
if (!isset($_SESSION['user_id']) || !isset($_SESSION['role']) || !in_array($_SESSION['role'], ['admin', 'employee'])) {
  error_log("dashboard.php: Sessiooni andmed puuduvad või roll pole lubatud. Sessiooni andmed: " . print_r($_SESSION, true));
  header("Location: login.php");
  exit;
}

// Kui kasutaja pole admin, logime seda, aga jätame juurdepääsu (või vajadusel saad suunata employee eraldi lehele)
if ($_SESSION['role'] !== 'admin') {
  error_log("dashboard.php: Kasutaja pole admin. Sessiooni andmed: " . print_r($_SESSION, true));
  // Võid siin vajadusel anda teate, et employee vaade on piiratud, või lasta neil edasi töötada.
}

// Laadime logija initsialiseerimise faili
require_once __DIR__ . '/../logger.php';

// Ülesanne: logime ainult vead – seega ei logita info tasemel sündmusi, vaid ainult errorid (näiteks kui andmebaasi ühendus ebaõnnestub)
require_once '../config/config.php';
$pdo = getDBConnection();
if (!$pdo) {
  $log->error('dashboard.php: Andmebaasi ühendus ebaõnnestus.');
  die("Andmebaasi ühendus ebaõnnestus.");
}

$user_id = $_SESSION['user_id'];
$user_role = $_SESSION['role'];

// Aktiivse tööaja päring (end_time IS NULL) – lisame objekti koordinaadid ja raadiuse
$stmt = $pdo->prepare("
    SELECT tl.*, o.name AS object_name, o.description AS object_description,
           o.latitude, o.longitude, o.radius
    FROM time_logs tl 
    JOIN objects o ON tl.object_id = o.id 
    WHERE tl.user_id = ? AND tl.end_time IS NULL 
    ORDER BY tl.start_time DESC 
    LIMIT 1
");
if (!$stmt->execute([$user_id])) {
  $log->error('dashboard.php: Aktiivse tööaja päring ebaõnnestus.', ['user_id' => $user_id]);
}
$activeLog = $stmt->fetch(PDO::FETCH_ASSOC);

// Kui aktiivset töölogi ei leidu, võta viimase lõpetatud töölogi andmed
$lastFinished = null;
if (!$activeLog) {
  $stmt2 = $pdo->prepare("
        SELECT tl.*, o.name AS object_name, o.description AS object_description 
        FROM time_logs tl 
        JOIN objects o ON tl.object_id = o.id 
        WHERE tl.user_id = ? AND tl.end_time IS NOT NULL 
        ORDER BY tl.end_time DESC 
        LIMIT 1
    ");
  if (!$stmt2->execute([$user_id])) {
    $log->error('dashboard.php: Viimase lõpetatud tööloga päring ebaõnnestus.', ['user_id' => $user_id]);
  }
  $lastFinished = $stmt2->fetch(PDO::FETCH_ASSOC);
}

// Kuu kokkuvõtte arvutused (ainult lõpetatud töölogid)
$startOfMonth = date("Y-m-01 00:00:00");
$endOfMonth = date("Y-m-t 23:59:59");
$stmt3 = $pdo->prepare("SELECT SUM(TIMESTAMPDIFF(SECOND, start_time, end_time))/3600 AS total_hours 
                         FROM time_logs 
                         WHERE user_id = ? AND start_time BETWEEN ? AND ? AND end_time IS NOT NULL");
if (!$stmt3->execute([$user_id, $startOfMonth, $endOfMonth])) {
  $log->error('dashboard.php: Kuu kokkuvõtte päring ebaõnnestus.', ['user_id' => $user_id]);
}
$result = $stmt3->fetch(PDO::FETCH_ASSOC);
$totalHours = isset($result['total_hours']) ? round($result['total_hours'], 2) : 0;

// Lae kasutaja andmed (tunnihind, avanss)
$stmtUser = $pdo->prepare("SELECT hourly_rate, advance FROM users WHERE id = ?");
if (!$stmtUser->execute([$user_id])) {
  $log->error('dashboard.php: Kasutaja andmete päring ebaõnnestus.', ['user_id' => $user_id]);
}
$userData = $stmtUser->fetch(PDO::FETCH_ASSOC);
$hourlyRate = isset($userData['hourly_rate']) ? $userData['hourly_rate'] : 0;
$advance = isset($userData['advance']) ? $userData['advance'] : 0;
$totalEarnings = round($totalHours * $hourlyRate, 2);
$netSalary = round($totalEarnings - $advance, 2);

// Dünaamiline kuu eesmärk: arvuta tööpäevad (esmaspäevast reedeni) ja korruta 8-ga
$startDate = new DateTime("first day of this month");
$endDate = new DateTime("last day of this month");
$workDays = 0;
$interval = new DateInterval('P1D');
$period = new DatePeriod($startDate, $interval, $endDate->modify('+1 day'));
foreach ($period as $day) {
  if ($day->format('N') < 6) {
    $workDays++;
  }
}
$monthlyTarget = $workDays * 8;
$progress = $monthlyTarget > 0 ? min(round(($totalHours / $monthlyTarget) * 100), 100) : 0;
?>
<!DOCTYPE html>
<html lang="et">

<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Dashboard</title>
  <!-- Bootstrap 5 CSS -->
  <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet">
  <!-- Google Fonts -->
  <link href="https://fonts.googleapis.com/css2?family=Poppins:wght@400;600&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="style.css">
  <!-- Favicons ja muu meta info -->
  <link rel="icon" type="image/png" href="/img/favicon-96x96.png" sizes="96x96" />
  <link rel="icon" type="image/svg+xml" href="/img/favicon.svg" />
  <link rel="shortcut icon" href="/img/favicon.ico" />
  <link rel="apple-touch-icon" sizes="180x180" href="/img/apple-touch-icon.png" />
  <meta name="apple-mobile-web-app-title" content="GretMar" />
  <!-- Font Awesome ikoonid -->
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.2/css/all.min.css">

  <style>
    body {
      font-family: 'Poppins', sans-serif;
      background: linear-gradient(135deg, #f5f7fa, #c3cfe2);
      min-height: 100vh;
      display: flex;
      flex-direction: column;
    }

    .container {
      animation: fadeIn 1s ease-in-out;
      margin-top: 10px;
      margin-bottom: 20px;
    }

    @keyframes fadeIn {
      from {
        opacity: 0;
        transform: translateY(20px);
      }

      to {
        opacity: 1;
        transform: translateY(0);
      }
    }

    .card {
      border: none;
      border-radius: 1rem;
      box-shadow: 0 6px 20px rgba(0, 0, 0, 0.1);
      margin-bottom: 20px;
      transition: transform 0.3s ease, box-shadow 0.3s ease;
    }

    .card:hover {
      transform: translateY(-5px);
      box-shadow: 0 8px 25px rgba(0, 0, 0, 0.15);
    }


    .btn {
      transition: transform 0.2s ease, box-shadow 0.2s ease;
    }

    .btn:hover {
      transform: translateY(-3px);
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    }

    .card-title {
      font-weight: 600;
    }

    .progress {
      height: 20px;
      border-radius: 10px;
    }

    .progress-bar {
      font-weight: 600;
      font-size: 0.9rem;
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
  <!-- Navbar -->
  <nav class="navbar navbar-expand-lg navbar-light bg-white shadow-sm mb-4">
    <div class="container">
      <a class="navbar-brand" href="admin_dashboard.php">
        <img src="img/tarmel.jpg" alt="Ettevõtte logo" style="height:50px; margin-right:10px;">
        TarMel Ehitus
      </a>
      <div class="d-flex">
        <a href="logout.php" class="btn btn-danger">
          <i class="fas fa-sign-out-alt"></i> Logi välja
        </a>
      </div>
    </div>
  </nav>

  <!-- Sisu -->
  <div class="container py-5">
    <h1 class="mb-4">Tere, <?php echo htmlspecialchars($_SESSION['username']); ?>!</h1>

    <!-- Tööaja teave -->
    <?php if ($activeLog): ?>
      <div class="card">
        <div class="card-body">
          <h5 class="card-title text-success"><i class="fas fa-check-circle"></i> Tööle registreeritud</h5>
          <p class="card-text">
            <i class="fas fa-map-marker-alt"></i> <strong>Objekt:</strong>
            <?php echo htmlspecialchars($activeLog['object_name']); ?><br>
            <i class="fas fa-clock"></i> <strong>Alates:</strong>
            <?php echo date("Y-m-d H:i:s", strtotime($activeLog['start_time'])); ?>
          </p>
        </div>
      </div>
      <!-- Kui aktiivne töölog on olemas, edastame log_id JS-i -->
      <script>
        var activeLogId = <?php echo json_encode($activeLog['id']); ?>;
      </script>
    <?php else: ?>
      <div class="card">
        <div class="card-body">
          <h5 class="card-title text-secondary">Aktiivset tööpäeva pole registreeritud</h5>
          <?php if ($lastFinished): ?>
            <p class="card-text">
              <strong>Viimane lõpetatud tööpäev:</strong><br>
              <strong>Objekt:</strong> <?php echo htmlspecialchars($lastFinished['object_name']); ?><br>
              <strong>Algas:</strong> <?php echo date("Y-m-d H:i:s", strtotime($lastFinished['start_time'])); ?><br>
              <strong>Lõppes:</strong> <?php echo date("Y-m-d H:i:s", strtotime($lastFinished['end_time'])); ?><br>
              <?php if (!empty($lastFinished['comment'])): ?>
                <strong>Kommentaar:</strong> <?php echo htmlspecialchars($lastFinished['comment']); ?>
              <?php endif; ?>
            </p>
          <?php endif; ?>
        </div>
      </div>
    <?php endif; ?>

    <!-- Kuu kokkuvõte -->
    <div class="card">
      <div class="card-body">
        <h5 class="card-title"><i class="fas fa-chart-line"></i> Kuu kokkuvõte</h5>
        <p class="card-text">
          <i class="fas fa-clock"></i> <strong>Töötunde:</strong> <?php echo $totalHours; ?><br>
          <i class="fas fa-euro-sign"></i> <strong>Tunnihind:</strong> €<?php echo number_format($hourlyRate, 2); ?><br>
          <i class="fas fa-wallet"></i> <strong>Teenitud:</strong> €<?php echo number_format($totalEarnings, 2); ?><br>
          <i class="fas fa-money-bill-wave"></i> <strong>Avanss:</strong> €<?php echo number_format($advance, 2); ?><br>
          <i class="fas fa-hand-holding-usd"></i> <strong>Netopalk:</strong>
          €<?php echo number_format($netSalary, 2); ?>
        </p>
        <div class="mt-3">
          <div class="d-flex justify-content-between">
            <small><i class="fas fa-bullseye"></i> Eesmärk: <?php echo $monthlyTarget; ?> tundi</small>
            <small><i class="fas fa-percentage"></i> <?php echo $progress; ?>%</small>
          </div>
          <div class="progress">
            <div class="progress-bar bg-info" role="progressbar" style="width: <?php echo $progress; ?>%;"
              aria-valuenow="<?php echo $progress; ?>" aria-valuemin="0" aria-valuemax="100"><?php echo $progress; ?>%
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Põhinupud kasutajale -->
    <div class="d-grid gap-3 d-sm-flex justify-content-sm-center my-4">
      <a href="start_work.php" class="btn btn-primary btn-lg" data-bs-toggle="tooltip" title="Alusta oma tööpäeva">
        <i class="fas fa-play"></i> Alusta tööpäeva
      </a>
      <a href="end_work.php" class="btn btn-warning btn-lg" data-bs-toggle="tooltip" title="Lõpeta oma tööpäev">
        <i class="fas fa-stop"></i> Lõpeta tööpäev
      </a>
      <a href="work_history.php" class="btn btn-info btn-lg" data-bs-toggle="tooltip" title="Vaata oma tööajalugu">
        <i class="fas fa-history"></i> Tööajalugu
      </a>
    </div>

    <!-- Admin funktsioonid -->
    <?php if ($user_role === 'admin'): ?>
      <hr>
      <h2 class="mb-3"><i class="fas fa-user-shield"></i> Admin funktsioonid</h2>
      <div class="d-grid gap-3 d-sm-flex justify-content-sm-center">
        <a href="admin_users.php" class="btn btn-outline-secondary btn-lg">
          <i class="fas fa-users"></i> Kasutajad
        </a>
        <a href="admin_objects.php" class="btn btn-outline-secondary btn-lg">
          <i class="fas fa-building"></i> Objektid
        </a>
        <a href="admin_report.php" class="btn btn-outline-secondary btn-lg">
          <i class="fas fa-file-alt"></i> Raportid
        </a>
        <a href="team_performance.php" class="btn btn-outline-secondary btn-lg">
          <i class="fas fa-users-cog"></i> Meeskonna tulemus
        </a>
        <a href="admin_settings.php" class="btn btn-outline-secondary btn-lg">
          <i class="fas fa-cogs"></i> Seaded
        </a>
      </div>
    <?php endif; ?>

  </div>

  <!-- Geofencing kontroll – kui aktiivne töölog on olemas, kontrollime asukohta -->
  <?php if ($activeLog && isset($activeLog['latitude'], $activeLog['longitude'], $activeLog['radius'])): ?>
    <script>
      var objectLat = <?php echo $activeLog['latitude']; ?>;
      var objectLon = <?php echo $activeLog['longitude']; ?>;
      var objectRadius = <?php echo $activeLog['radius']; ?>; // raadius meetrites

      // Haversine'i valem, et arvutada kaugus kahe koordinaadi vahel (meetrites)
      function calculateDistance(lat1, lon1, lat2, lon2) {
        var R = 6371000; // Maa raadius meetrites
        var dLat = (lat2 - lat1) * Math.PI / 180;
        var dLon = (lon2 - lon1) * Math.PI / 180;
        var a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
          Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
          Math.sin(dLon / 2) * Math.sin(dLon / 2);
        var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return R * c;
      }

      // Kontrolli asukohta lehe laadimisel
      window.addEventListener('load', function () {
        if (navigator.geolocation) {
          navigator.geolocation.getCurrentPosition(function (position) {
            var userLat = position.coords.latitude;
            var userLon = position.coords.longitude;
            var distance = calculateDistance(userLat, userLon, objectLat, objectLon);
            console.log('Kaugus objektist:', distance, 'meetrit');
            if (distance > objectRadius) {
              console.log("Geofencing: töötaja on väljaspool raadiust. Automaatne lõpetamine käivitatakse.");
              if (typeof activeLogId !== 'undefined') {
                fetch('end_work_action.php', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                  body: 'log_id=' + encodeURIComponent(activeLogId) + '&auto=1&comment=' + encodeURIComponent("Tööpäev lõpetatud automaatselt kuna töötaja oli raadiusest väljas")
                })
                  .then(response => response.text())
                  .then(data => {
                    console.log("Automaatse lõpetamise vastus:", data);
                    window.location.href = 'dashboard.php';
                  })
                  .catch(err => console.error("Automaatse lõpetamise viga:", err));
              } else {
                console.error("activeLogId pole määratud.");
              }
            }
          }, function (error) {
            console.error('Geolokatsiooni viga:', error);
          }, { timeout: 10000 });
        } else {
          console.error("Brauser ei toeta geolokatsiooni.");
        }
      });
    </script>
  <?php endif; ?>

  <!-- jQuery (DataTables dependency) -->
  <script src="https://code.jquery.com/jquery-3.6.0.min.js"></script>
  <!-- Bootstrap 5 JS Bundle -->
  <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/js/bootstrap.bundle.min.js"></script>
  <!-- DataTables JS -->
  <script src="https://cdn.datatables.net/1.13.4/js/jquery.dataTables.min.js"></script>
  <script src="https://cdn.datatables.net/1.13.4/js/dataTables.bootstrap5.min.js"></script>
  <!-- DataTables Buttons JS and dependencies -->
  <script src="https://cdn.datatables.net/buttons/2.3.6/js/dataTables.buttons.min.js"></script>
  <script src="https://cdn.datatables.net/buttons/2.3.6/js/buttons.bootstrap5.min.js"></script>
  <script src="https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js"></script>
  <script src="https://cdn.datatables.net/buttons/2.3.6/js/buttons.html5.min.js"></script>
  <script>
    $(document).ready(function () {
      $('#logsTable').DataTable({
        "order": [[1, "desc"]],
        "lengthMenu": [10, 25, 50, 100],
        "language": {
          "url": "//cdn.datatables.net/plug-ins/1.13.4/i18n/Estonian.json"
        },
        dom: 'Bfltip',
        buttons: [
          {
            extend: 'csvHtml5',
            text: 'Export CSV',
            className: 'btn btn-outline-secondary',
            exportOptions: {
              footer: false
            },
            customize: function (csv) {
              var footerRow = '\n"Kokku tunnid:","","","<?php echo $totalHours; ?>",""';
              return csv + footerRow;
            }
          }
        ]
      });
    });
  </script>

  <!-- Veateate popup modal -->
  <div class="modal fade" id="dataErrorModal" tabindex="-1" aria-labelledby="dataErrorModalLabel" aria-hidden="true">
    <div class="modal-dialog">
      <div class="modal-content">
        <div class="modal-header">
          <h5 class="modal-title" id="dataErrorModalLabel">Viga</h5>
          <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Sulge"></button>
        </div>
        <div class="modal-body">
          Tekkis viga andmete laadimisel. Palun proovi uuesti hiljem.
        </div>
        <div class="modal-footer">
          <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Sulge</button>
        </div>
      </div>
    </div>
  </div>
</body>
<footer>
  <div class="container">
    <small>&copy; <?php echo date("Y"); ?> GretMar. Kõik õigused kaitstud.</small>
  </div>
</footer>

</html>