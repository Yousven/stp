<?php
session_start();
if (!isset($_SESSION['user_id']) || $_SESSION['role'] !== 'admin') {
    header('Location: login.php');
    exit;
}
require_once '../config/config.php';
$pdo = getDBConnection();

// Laadi kõik kasutajad
$stmt = $pdo->query("SELECT id, username, email, hourly_rate, advance, role FROM users ORDER BY username");
$users = $stmt->fetchAll(PDO::FETCH_ASSOC);

// Määrame kuu alguse ja lõpu
$startOfMonth = date("Y-m-01 00:00:00");
$endOfMonth   = date("Y-m-t 23:59:59");

// Arvutame kuu eesmärgi (normtunnid) – tööpäevad (esmaspäevast reedeni) * 8
$startDate = new DateTime("first day of this month");
$endDate   = new DateTime("last day of this month");
$endDate->modify('+1 day'); // lisame viimase päeva
$workDays = 0;
$period = new DatePeriod($startDate, new DateInterval('P1D'), $endDate);
foreach ($period as $day) {
    if ($day->format('N') < 6) {
        $workDays++;
    }
}
$monthlyTarget = $workDays * 8;
?>
<!DOCTYPE html>
<html lang="et">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Halda kasutajaid</title>
  <!-- Bootstrap 5 CSS -->
  <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet">
  <!-- Bootstrap Icons -->
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.10.5/font/bootstrap-icons.css">
  <!-- DataTables CSS -->
  <link rel="stylesheet" href="https://cdn.datatables.net/1.13.4/css/dataTables.bootstrap5.min.css">
  <!-- Custom CSS -->
  <link rel="stylesheet" href="style.css">
  <style>
    body {
      background: linear-gradient(135deg, #ece9e6, #ffffff);
      min-height: 100vh;
      display: flex;
      flex-direction: column;
      font-family: 'Poppins', sans-serif;
    }
    .container {
      animation: fadeIn 0.8s ease-in-out;
      margin-top: 20px;
      margin-bottom: 20px;
    }
    @keyframes fadeIn {
      from { opacity: 0; transform: translateY(20px); }
      to { opacity: 1; transform: translateY(0); }
    }
    footer {
      background: #fff;
      padding: 1rem 0;
      text-align: center;
      margin-top: auto;
      box-shadow: 0 -2px 6px rgba(0,0,0,0.1);
    }
    .card {
      margin-bottom: 20px;
      transition: transform 0.2s ease, box-shadow 0.2s ease;
    }
    .card:hover {
      transform: translateY(-5px);
      box-shadow: 0 8px 20px rgba(0,0,0,0.15);
    }
    .btn:hover {
      transform: translateY(-2px);
      transition: transform 0.2s;
    }
    /* Progress bar animation */
    .progress-bar {
      transition: width 1s ease-in-out;
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
        <a href="admin_add_user.php" class="btn btn-primary me-2" data-bs-toggle="tooltip" title="Lisa uus kasutaja"><i class="bi bi-plus-circle"></i></a>
        <a href="logout.php" class="btn btn-danger" data-bs-toggle="tooltip" title="Logi välja">Logi välja</a>
      </div>
    </div>
  </nav>

  <!-- Peamine sisu -->
  <div class="container py-4">
    <h1 class="mb-4 text-center">Kasutajate haldamine</h1>
    <div class="row">
      <?php 
      // Loop läbi kasutajate ja kuva igaüks eraldi cardina
      foreach ($users as $user):
          // Arvuta selle kuu töötunnid ja teenitud palk kasutaja jaoks
          $stmtHours = $pdo->prepare("SELECT SUM(TIMESTAMPDIFF(SECOND, start_time, end_time))/3600 AS total_hours 
                                      FROM time_logs 
                                      WHERE user_id = ? 
                                        AND start_time BETWEEN ? AND ? 
                                        AND end_time IS NOT NULL");
          $stmtHours->execute([$user['id'], $startOfMonth, $endOfMonth]);
          $hoursData = $stmtHours->fetch(PDO::FETCH_ASSOC);
          $totalHours = isset($hoursData['total_hours']) ? round($hoursData['total_hours'], 2) : 0;
          $totalEarnings = round($totalHours * $user['hourly_rate'], 2);
          $progress = $monthlyTarget > 0 ? round(($totalHours / $monthlyTarget) * 100, 2) : 0;
      ?>
      <div class="col-md-4">
        <div class="card h-100">
          <div class="card-body">
            <h5 class="card-title"><?php echo htmlspecialchars($user['username']); ?></h5>
            <p class="card-text">
              <strong>E-mail:</strong> <?php echo htmlspecialchars($user['email']); ?><br>
              <strong>Roll:</strong> <?php echo htmlspecialchars($user['role']); ?><br>
              <strong>Tunni hind:</strong> €<?php echo number_format($user['hourly_rate'], 2); ?><br>
              <strong>Avans:</strong> €<?php echo number_format($user['advance'], 2); ?>
            </p>
            <hr>
            <p class="card-text">
              <strong>Kuu töötunnid:</strong> <?php echo $totalHours; ?> tundi<br>
              <strong>Kuu eesmärk:</strong> <?php echo $monthlyTarget; ?> tundi
            </p>
            <div class="progress mb-2">
              <div class="progress-bar bg-info" role="progressbar" style="width: 0%;" aria-valuenow="<?php echo $progress; ?>" aria-valuemin="0" aria-valuemax="100">
                <?php echo $progress; ?>%
              </div>
            </div>
            <p class="card-text">
              <strong>Teenitud:</strong> €<?php echo number_format($totalEarnings, 2); ?>
            </p>
          </div>
          <div class="card-footer text-center">
            <a href="admin_edit_user.php?id=<?php echo $user['id']; ?>" class="btn btn-sm btn-warning" data-bs-toggle="tooltip" title="Muuda kasutajat"><i class="bi bi-pencil"></i> Muuda</a>
            <button type="button" class="btn btn-sm btn-danger deleteBtn" data-user-id="<?php echo $user['id']; ?>" data-username="<?php echo htmlspecialchars($user['username']); ?>" data-bs-toggle="tooltip" title="Kustuta kasutaja"><i class="bi bi-trash"></i> Kustuta</button>
          </div>
        </div>
      </div>
      <?php endforeach; ?>
    </div>
    <div class="text-center mt-4">
      <a href="dashboard.php" class="btn btn-outline-secondary">Tagasi Dashboardile</a>
    </div>
  </div>
  
  <!-- Delete Modal -->
  <div class="modal fade" id="deleteModal" tabindex="-1" aria-labelledby="deleteModalLabel" aria-hidden="true">
    <div class="modal-dialog modal-dialog-centered">
      <div class="modal-content">
        <div class="modal-header">
          <h5 class="modal-title" id="deleteModalLabel">Kustuta kasutaja</h5>
          <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Sulge"></button>
        </div>
        <div class="modal-body">
          Kas oled kindel, et soovid kustutada kasutaja <strong id="modalUsername"></strong>?
        </div>
        <div class="modal-footer">
          <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Tühista</button>
          <a id="confirmDeleteBtn" href="#" class="btn btn-danger">Kustuta</a>
        </div>
      </div>
    </div>
  </div>
  
  <!-- Footer -->
  <footer class="bg-white text-center py-3 shadow-sm">
    <div class="container">
      <small>&copy; <?php echo date("Y"); ?> GretMar. Kõik õigused kaitstud.</small>
    </div>
  </footer>
  
  <!-- jQuery (optional, for Bootstrap tooltips and modal) -->
  <script src="https://code.jquery.com/jquery-3.6.0.min.js"></script>
  <!-- Bootstrap 5 JS Bundle -->
  <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/js/bootstrap.bundle.min.js"></script>
  <script>
    $(document).ready(function() {
      // Aktiveeri tooltipid
      var tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'));
      tooltipTriggerList.forEach(function(tooltipTriggerEl) {
        new bootstrap.Tooltip(tooltipTriggerEl);
      });
      
      // Animate progress bars with percentage text visible
      $('.progress-bar').each(function() {
        var progress = $(this).attr('aria-valuenow');
        $(this).animate({ width: progress + '%' }, 1000, function() {
          $(this).text(progress + '%');
        });
      });
      
      // Kustutamise nupu event listenerid
      var deleteButtons = document.querySelectorAll('.deleteBtn');
      deleteButtons.forEach(function(btn) {
        btn.addEventListener('click', function() {
          var userId = this.getAttribute('data-user-id');
          // Kasuta mõlemat atribuutide varianti
          var username = this.getAttribute('data-user-name') || this.getAttribute('data-username');
          document.getElementById('modalUsername').textContent = username;
          document.getElementById('confirmDeleteBtn').setAttribute('href', 'admin_delete_user.php?id=' + userId);
          var deleteModal = new bootstrap.Modal(document.getElementById('deleteModal'));
          deleteModal.show();
        });
      });
    });
  </script>
</body>
</html>
