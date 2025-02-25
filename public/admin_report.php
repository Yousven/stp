<?php
session_start();
if (!isset($_SESSION['user_id']) || $_SESSION['role'] !== 'admin') {
  header("Location: login.php");
  exit;
}
require_once '../config/config.php';
$pdo = getDBConnection();

// Filtrite väärtused (tööline, objekt, kuupäevad)
$filter_employee = $_GET['tööline'] ?? '';
$filter_object = $_GET['objekt'] ?? '';
$filter_date_from = $_GET['kuupäev_alates'] ?? '';
$filter_date_to = $_GET['kuupäev_kuni'] ?? '';

// Ehita päring tööaja logide jaoks (ainult lõpetatud tööpäevad)
$query = "SELECT tl.*, u.username, o.name AS object_name
          FROM time_logs tl
          JOIN users u ON tl.user_id = u.id
          JOIN objects o ON tl.object_id = o.id
          WHERE tl.end_time IS NOT NULL";
$params = [];

if (!empty($filter_employee)) {
  $query .= " AND tl.user_id = ?";
  $params[] = $filter_employee;
}
if (!empty($filter_object)) {
  $query .= " AND tl.object_id = ?";
  $params[] = $filter_object;
}
if (!empty($filter_date_from)) {
  $query .= " AND DATE(tl.start_time) >= ?";
  $params[] = $filter_date_from;
}
if (!empty($filter_date_to)) {
  $query .= " AND DATE(tl.start_time) <= ?";
  $params[] = $filter_date_to;
}
$query .= " ORDER BY tl.start_time DESC";

$stmt = $pdo->prepare($query);
$stmt->execute($params);
$logs = $stmt->fetchAll(PDO::FETCH_ASSOC);

// Arvuta kokku netotunnid (tundides): iga tööaja logi netotunnid = (brutotunnid - lunch)
$totalNetHours = 0;
foreach ($logs as $log) {
  $gross = (strtotime($log['end_time']) - strtotime($log['start_time'])) / 3600;
  $lunch = isset($log['lunch']) ? (float) $log['lunch'] : 0;
  $net = $gross - $lunch;
  $totalNetHours += $net;
}
$totalNetHours = round($totalNetHours, 2);

// Laadi töötajate ja objektide nimekirjad filtreerimiseks
$stmt_emp = $pdo->query("SELECT id, username FROM users ORDER BY username");
$töölised = $stmt_emp->fetchAll(PDO::FETCH_ASSOC);

$stmt_obj = $pdo->query("SELECT id, name FROM objects ORDER BY name");
$objektid = $stmt_obj->fetchAll(PDO::FETCH_ASSOC);
?>
<!DOCTYPE html>
<html lang="et">

<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Admin aruanded</title>
  <!-- Bootstrap 5 CSS -->
  <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet">
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

    /* Loading overlay */
    #loadingOverlay {
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(255, 255, 255, 0.8);
      z-index: 9999;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .container {
      animation: fadeIn 1s ease-in-out;
      margin-top: 20px;
      margin-bottom: 20px;
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

    footer {
      background: #fff;
      padding: 1rem 0;
      text-align: center;
      margin-top: auto;
      box-shadow: 0 -2px 6px rgba(0, 0, 0, 0.1);
    }

    .btn:hover {
      transform: translateY(-2px);
      transition: transform 0.2s;
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
  <!-- Loading Overlay -->
  <div id="loadingOverlay">
    <div class="spinner-border text-primary" role="status">
      <span class="visually-hidden">Laadimine...</span>
    </div>
  </div>

  <div class="container py-4">
    <h1 class="mb-4 text-center">Admin aruanded</h1>

    <!-- Filtrivorm -->
    <form method="get" action="admin_report.php" class="row g-3 mb-4">
      <div class="col-md-3 col-12">
        <label for="tööline" class="form-label">Tööline</label>
        <select name="tööline" id="tööline" class="form-select">
          <option value="">Kõik töötajad</option>
          <?php foreach ($töölised as $emp): ?>
            <option value="<?php echo $emp['id']; ?>" <?php if ($filter_employee == $emp['id'])
                 echo "selected"; ?>>
              <?php echo htmlspecialchars($emp['username']); ?>
            </option>
          <?php endforeach; ?>
        </select>
      </div>
      <div class="col-md-3 col-12">
        <label for="objekt" class="form-label">Objekt</label>
        <select name="objekt" id="objekt" class="form-select">
          <option value="">Kõik objektid</option>
          <?php foreach ($objektid as $obj): ?>
            <option value="<?php echo $obj['id']; ?>" <?php if ($filter_object == $obj['id'])
                 echo "selected"; ?>>
              <?php echo htmlspecialchars($obj['name']); ?>
            </option>
          <?php endforeach; ?>
        </select>
      </div>
      <div class="col-md-3 col-12">
        <label for="kuupäev_alates" class="form-label">Kuupäev alates</label>
        <input type="date" name="kuupäev_alates" id="kuupäev_alates" class="form-control"
          value="<?php echo htmlspecialchars($filter_date_from); ?>">
      </div>
      <div class="col-md-3 col-12">
        <label for="kuupäev_kuni" class="form-label">Kuupäev kuni</label>
        <input type="date" name="kuupäev_kuni" id="kuupäev_kuni" class="form-control"
          value="<?php echo htmlspecialchars($filter_date_to); ?>">
      </div>
      <div class="col-12 d-flex justify-content-between">
        <button type="submit" class="btn btn-primary">Filtreeri</button>
        <a href="admin_report.php" class="btn btn-secondary">Reset Filters</a>
      </div>
    </form>

    <!-- Tööajakirje tabel -->
    <div class="table-responsive mb-4">
      <table id="logsTable" class="table table-bordered table-striped">
        <thead class="table-light">
          <tr>
            <th>Tööline</th>
            <th>Objekt</th>
            <th>Alustas</th>
            <th>Lõppes</th>
            <th>Brutotunnid</th>
            <th>Lõuna (tunnid)</th>
            <th>Netotunnid</th>
            <th>Kommentaar</th>
          </tr>
        </thead>
        <tbody>
          <?php if (count($logs) > 0): ?>
            <?php foreach ($logs as $log): ?>
              <?php
              $gross = (strtotime($log['end_time']) - strtotime($log['start_time'])) / 3600;
              $grossRounded = round($gross, 2);
              $lunch = isset($log['lunch']) ? (float) $log['lunch'] : 0;
              $net = $gross - $lunch;
              $netRounded = round($net, 2);
              ?>
              <tr>
                <td><?php echo htmlspecialchars($log['username']); ?></td>
                <td><?php echo htmlspecialchars($log['object_name']); ?></td>
                <td><?php echo date("Y-m-d H:i:s", strtotime($log['start_time'])); ?></td>
                <td><?php echo date("Y-m-d H:i:s", strtotime($log['end_time'])); ?></td>
                <td><?php echo $grossRounded; ?></td>
                <td><?php echo htmlspecialchars($log['lunch']); ?></td>
                <td><?php echo $netRounded; ?></td>
                <td><?php echo htmlspecialchars($log['comment']); ?></td>
              </tr>
            <?php endforeach; ?>
          <?php else: ?>
            <tr>
              <td colspan="8" class="text-center">Ühtegi tööaja kirjet ei leitud.</td>
            </tr>
          <?php endif; ?>
        </tbody>
      </table>
    </div>

    <!-- Kokkuvõtte teade -->
    <div class="alert alert-info">
      <strong>Kokku (netotunnid):</strong> Valitud perioodi jooksul on tööpäevade netotunnid kokku
      <strong><?php echo $totalNetHours; ?></strong>.
    </div>

    <!-- Ekspordi ja prindi nupud -->
    <div class="d-grid gap-2 d-sm-flex justify-content-sm-center mt-4">
      <a href="export_report_excel.php?<?php echo http_build_query($_GET); ?>" class="btn btn-success btn-lg"
        data-bs-toggle="tooltip" title="Laadi alla Excel vormingus">Laadi alla Excel</a>
      <a href="export_report_pdf.php?<?php echo http_build_query($_GET); ?>" class="btn btn-danger btn-lg"
        data-bs-toggle="tooltip" title="Laadi alla PDF vormingus">Laadi alla PDF</a>
      <button type="button" class="btn btn-secondary btn-lg" onclick="window.print();" data-bs-toggle="tooltip"
        title="Prindi aruande">Prindi</button>
    </div>

    <a href="dashboard.php" class="btn btn-outline-secondary mt-3">Tagasi Dashboardile</a>
  </div>

  <!-- Modal, mis kuvatakse kui logisid pole -->
  <div class="modal fade" id="noLogsModal" tabindex="-1" aria-labelledby="noLogsModalLabel" aria-hidden="true">
    <div class="modal-dialog modal-dialog-centered">
      <div class="modal-content">
        <div class="modal-header">
          <h5 class="modal-title" id="noLogsModalLabel">Andmeid ei leitud</h5>
          <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Sulge"></button>
        </div>
        <div class="modal-body">
          Vastavate filtritega tööaja kirjeid ei leitud. Palun kontrolli filtreid.
        </div>
        <div class="modal-footer">
          <button type="button" class="btn btn-primary" data-bs-dismiss="modal">OK</button>
        </div>
      </div>
    </div>
  </div>

  <!-- jQuery (DataTables dependency) -->
  <script src="https://code.jquery.com/jquery-3.6.0.min.js"></script>
  <!-- Bootstrap 5 JS Bundle -->
  <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/js/bootstrap.bundle.min.js"></script>
  <!-- DataTables JS -->
  <script src="https://cdn.datatables.net/1.13.4/js/jquery.dataTables.min.js"></script>
  <script src="https://cdn.datatables.net/1.13.4/js/dataTables.bootstrap5.min.js"></script>
  <script>
    $(document).ready(function () {
      // Kasutame loading overlay-d DataTables initsialiseerimiseks
      var logsCount = <?php echo count($logs); ?>;
      if (logsCount > 0) {
        var table = $('#logsTable').DataTable({
          "order": [[2, "desc"]],
          "lengthMenu": [10, 25, 50, 100],
          "language": {
            "url": "//cdn.datatables.net/plug-ins/1.13.4/i18n/Estonian.json"
          },
          "initComplete": function (settings, json) {
            // Peida loading overlay, kui DataTables on initsialiseeritud
            $('#loadingOverlay').fadeOut();
          }
        });

        // Aktiveeri tooltipid
        var tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'));
        tooltipTriggerList.forEach(function (tooltipTriggerEl) {
          new bootstrap.Tooltip(tooltipTriggerEl);
        });
      } else {
        $('#loadingOverlay').fadeOut();
        // Kui tabelis pole kirjeid, kuva modaalaken
        var noLogsModal = new bootstrap.Modal(document.getElementById('noLogsModal'));
        noLogsModal.show();
      }
    });
  </script>
</body>

</html>