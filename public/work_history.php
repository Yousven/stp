<?php
session_start();
if (!isset($_SESSION['user_id'])) {
  header('Location: login.php');
  exit;
}
require_once '../config/config.php';
$pdo = getDBConnection();
$user_id = $_SESSION['user_id'];

// Get filters from GET parameters
$filter_object = $_GET['object'] ?? '';
$filter_date_from = $_GET['date_from'] ?? '';
$filter_date_to = $_GET['date_to'] ?? '';

// Build the SQL query for the current user's work logs
$query = "SELECT tl.*, o.name AS object_name 
          FROM time_logs tl 
          JOIN objects o ON tl.object_id = o.id 
          WHERE tl.user_id = ?";
$params = [$user_id];

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

// Calculate total hours for finished work logs (with end_time) subtracting lunch hours
$totalHours = 0;
foreach ($logs as $log) {
  if (!empty($log['end_time'])) {
    $duration = (strtotime($log['end_time']) - strtotime($log['start_time'])) / 3600;
    $lunch = !empty($log['lunch']) ? (float) $log['lunch'] : 0;
    $duration -= $lunch;
    $totalHours += $duration;
  }
}
$totalHours = round($totalHours, 2);
?>
<!DOCTYPE html>
<html lang="et">

<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Tööajalugu</title>
  <!-- Bootstrap 5 CSS -->
  <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet">
  <!-- DataTables CSS -->
  <link rel="stylesheet" href="https://cdn.datatables.net/1.13.4/css/dataTables.bootstrap5.min.css">
  <!-- DataTables Buttons CSS -->
  <link rel="stylesheet" href="https://cdn.datatables.net/buttons/2.3.6/css/buttons.bootstrap5.min.css">
  <!-- Custom CSS -->
  <link rel="stylesheet" href="style.css">
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
      box-shadow: 0 -2px 6px rgba(0, 0, 0, 0.1);
      margin-top: auto;
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

  <!-- Main Content -->
  <div class="container py-5">
    <h1 class="mb-4 text-center">Tööajalugu</h1>

    <!-- Filter Form -->
    <form method="get" action="work_history.php" class="row g-3 mb-4">
      <div class="col-md-3 col-12">
        <label for="object" class="form-label">Objekt</label>
        <select name="object" id="object" class="form-select">
          <option value="">Kõik objektid</option>
          <?php
          // Fetch available objects for filtering
          $stmt2 = $pdo->query("SELECT id, name FROM objects ORDER BY name");
          $objectsList = $stmt2->fetchAll(PDO::FETCH_ASSOC);
          foreach ($objectsList as $objItem): ?>
            <option value="<?php echo $objItem['id']; ?>" <?php if ($filter_object == $objItem['id'])
                 echo "selected"; ?>>
              <?php echo htmlspecialchars($objItem['name']); ?>
            </option>
          <?php endforeach; ?>
        </select>
      </div>
      <div class="col-md-3 col-12">
        <label for="date_from" class="form-label">Kuupäev alates</label>
        <input type="date" name="date_from" id="date_from" class="form-control"
          value="<?php echo htmlspecialchars($filter_date_from); ?>">
      </div>
      <div class="col-md-3 col-12">
        <label for="date_to" class="form-label">Kuupäev kuni</label>
        <input type="date" name="date_to" id="date_to" class="form-control"
          value="<?php echo htmlspecialchars($filter_date_to); ?>">
      </div>
      <div class="col-md-3 col-12 align-self-end">
        <div class="d-grid gap-2 d-md-flex">
          <button type="submit" class="btn btn-primary">Filtreeri</button>
          <a href="work_history.php" class="btn btn-outline-secondary">Reset</a>
        </div>
      </div>
    </form>

    <!-- Work Logs Table -->
    <div class="table-responsive mb-4">
      <table id="logsTable" class="table table-bordered table-striped">
        <thead class="table-light">
          <tr>
            <th>Objekt</th>
            <th>Alustas</th>
            <th>Lõppes</th>
            <th>Töötunnid</th>
            <th>Kommentaar</th>
            <?php if (isset($_SESSION['role']) && $_SESSION['role'] === 'admin'): ?>
              <th>Muuda</th>
            <?php endif; ?>
          </tr>
        </thead>
        <tbody>
  <?php if (count($logs) > 0): ?>
    <?php foreach ($logs as $log): ?>
      <?php
      if (!empty($log['end_time'])) {
        $workDuration = (strtotime($log['end_time']) - strtotime($log['start_time'])) / 3600;
        $lunch = !empty($log['lunch']) ? (float) $log['lunch'] : 0;
        $workDuration -= $lunch;
        $workDurationRounded = round($workDuration, 2);
      } else {
        $workDurationRounded = 'Aktiivne';
      }
      ?>
      <tr>
        <td><?php echo htmlspecialchars($log['object_name']); ?></td>
        <td><?php echo date("Y-m-d H:i:s", strtotime($log['start_time'])); ?></td>
        <td><?php echo !empty($log['end_time']) ? date("Y-m-d H:i:s", strtotime($log['end_time'])) : 'Aktiivne'; ?></td>
        <td><?php echo $workDurationRounded; ?></td>
        <td><?php echo htmlspecialchars($log['comment']); ?></td>
        <?php if (isset($_SESSION['role']) && $_SESSION['role'] === 'admin'): ?>
          <td>
            <button class="btn btn-sm btn-outline-primary edit-btn" data-logid="<?php echo $log['id']; ?>"
              data-workduration="<?php echo (is_numeric($workDurationRounded) ? $workDurationRounded : ''); ?>"
              data-lunch="<?php echo isset($log['lunch']) ? $log['lunch'] : ''; ?>"
              data-travel="<?php echo isset($log['travel_duration']) ? $log['travel_duration'] : ''; ?>">
              Muuda
            </button>
          </td>
        <?php endif; ?>
      </tr>
    <?php endforeach; ?>
  <?php else: ?>
    <tr id="noDataRow">
      <td colspan="<?php echo (isset($_SESSION['role']) && $_SESSION['role'] === 'admin') ? '6' : '5'; ?>" class="text-center text-muted">
        Ühtegi tööaja kirjet ei leitud.
      </td>
    </tr>
  <?php endif; ?>
</tbody>
        <tfoot>
          <tr>
            <th colspan="3" class="text-end">Kokku tunnid:</th>
            <th><?php echo $totalHours; ?></th>
            <th colspan="<?php echo (isset($_SESSION['role']) && $_SESSION['role'] === 'admin') ? '2' : '1'; ?>"></th>
          </tr>
        </tfoot>
      </table>
    </div>

    <!-- Total Hours Summary Alert -->
    <div class="alert alert-info">
      <strong>Kokku:</strong> Selle perioodi jooksul on lõpetatud tööpäevade tunnid (lõunaga lahutatuna) kokku
      <strong><?php echo $totalHours; ?></strong> tundi.
    </div>

    <a href="dashboard.php" class="btn btn-outline-secondary mt-3">Tagasi Dashboardile</a>
  </div>

  <!-- Edit Log Modal -->
  <div class="modal fade" id="editLogModal" tabindex="-1" aria-labelledby="editLogModalLabel" aria-hidden="true">
    <div class="modal-dialog modal-dialog-centered">
      <div class="modal-content">
        <form id="editLogForm" action="update_work_log.php" method="post">
          <div class="modal-header">
            <h5 class="modal-title" id="editLogModalLabel">Muuda tööaja andmeid</h5>
            <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Sulge"></button>
          </div>
          <div class="modal-body">
            <input type="hidden" name="log_id" id="editLogId">
            <div class="mb-3">
              <label for="editWorkDuration" class="form-label">Päeva tunnid</label>
              <input type="number" step="0.01" class="form-control" name="work_duration" id="editWorkDuration" required>
            </div>
            <div class="mb-3">
              <label for="editLunch" class="form-label">Lõuna kestus (tunnid)</label>
              <input type="number" step="0.01" class="form-control" name="lunch" id="editLunch" required>
            </div>
            <div class="mb-3">
              <label for="editTravel" class="form-label">Sõidu kestus (tunnid)</label>
              <input type="number" step="0.01" class="form-control" name="travel_duration" id="editTravel" required>
            </div>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Tühista</button>
            <button type="submit" class="btn btn-primary">Salvesta muudatused</button>
          </div>
        </form>
      </div>
    </div>
  </div>

  <!-- jQuery, Bootstrap, DataTables ja Buttons -->
  <script src="https://code.jquery.com/jquery-3.6.0.min.js"></script>
  <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/js/bootstrap.bundle.min.js"></script>
  <script src="https://cdn.datatables.net/1.13.4/js/jquery.dataTables.min.js"></script>
  <script src="https://cdn.datatables.net/1.13.4/js/dataTables.bootstrap5.min.js"></script>
  <script src="https://cdn.datatables.net/buttons/2.3.6/js/dataTables.buttons.min.js"></script>
  <script src="https://cdn.datatables.net/buttons/2.3.6/js/buttons.bootstrap5.min.js"></script>
  <script src="https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js"></script>
  <script src="https://cdn.datatables.net/buttons/2.3.6/js/buttons.html5.min.js"></script>
  <script>
$(document).ready(function () {
  var table = $('#logsTable').DataTable({
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
        exportOptions: { footer: false },
        customize: function (csv) {
          var footerRow = '\n"Kokku tunnid:","","","<?php echo $totalHours; ?>",""';
          return csv + footerRow;
        }
      }
    ]
  });

  // Kontrollime, kas tabel on tühi
  if (table.rows().count() === 0) {
    $('#noDataMessage').show();
  } else {
    $('#noDataMessage').hide();
  }
});


    // Bootstrapi tooltipide aktiveerimine
    var tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'));
    var tooltipList = tooltipTriggerList.map(function (tooltipTriggerEl) {
      return new bootstrap.Tooltip(tooltipTriggerEl);
    });

    // Edit nuppude käitlemine
    $(document).on('click', '.edit-btn', function () {
      var logId = $(this).data('logid');
      var workDuration = $(this).data('workduration');
      var lunch = $(this).data('lunch');
      var travel = $(this).data('travel');
      $('#editLogId').val(logId);
      $('#editWorkDuration').val(workDuration);
      $('#editLunch').val(lunch);
      $('#editTravel').val(travel);
      var editModal = new bootstrap.Modal(document.getElementById('editLogModal'));
      editModal.show();
    });

    // AJAX submission for Edit Log Form – peale andmete uuendamist värskendame lehte
    $("#editLogForm").submit(function (e) {
      e.preventDefault();
      $.ajax({
        url: $(this).attr('action'),
        type: 'POST',
        data: $(this).serialize(),
        success: function (response) {
          // After successful update, reload the page to show updated data
          window.location.reload();
        },
        error: function (xhr, status, error) {
          alert("Error updating log: " + error);
        }
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

  <!-- Geofencing kontroll – kui aktiivne töölog on olemas, kontrollime asukohta -->
  <?php if ($activeLog && isset($activeLog['latitude'], $activeLog['longitude'], $activeLog['radius'])): ?>
    <script>
      var objectLat = <?php echo $activeLog['latitude']; ?>;
      var objectLon = <?php echo $activeLog['longitude']; ?>;
      var objectRadius = <?php echo $activeLog['radius']; ?>; // raadius meetrites

      function calculateDistance(lat1, lon1, lat2, lon2) {
        var R = 6371000;
        var dLat = (lat2 - lat1) * Math.PI / 180;
        var dLon = (lon2 - lon1) * Math.PI / 180;
        var a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
          Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
          Math.sin(dLon / 2) * Math.sin(dLon / 2);
        var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return R * c;
      }

      window.addEventListener('load', function () {
        if (navigator.geolocation) {
          navigator.geolocation.getCurrentPosition(function (position) {
            var userLat = position.coords.latitude;
            var userLon = position.coords.longitude;
            var distance = calculateDistance(userLat, userLon, objectLat, objectLon);
            console.log("Kaugus objektist: " + distance + " meetrit");
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
                    console.log("Automaatse lõpetamise vastus: " + data);
                    window.location.href = "dashboard.php";
                  })
                  .catch(err => console.error("Automaatse lõpetamise viga: ", err));
              } else {
                console.error("activeLogId pole määratud.");
              }
            }
          }, function (error) {
            console.error("Geolokatsiooni viga: ", error);
          }, { timeout: 10000 });
        } else {
          console.error("Brauser ei toeta geolokatsiooni.");
        }
      });
    </script>
  <?php endif; ?>
</body>
<footer>
  <div class="container">
    <small>&copy; <?php echo date("Y"); ?> GretMar. Kõik õigused kaitstud.</small>
  </div>
</footer>

</html>