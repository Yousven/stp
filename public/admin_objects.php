<?php
session_start();
if (!isset($_SESSION['user_id']) || $_SESSION['role'] !== 'admin') {
  header('Location: login.php');
  exit;
}
require_once '../config/config.php';
$pdo = getDBConnection();

$stmt = $pdo->query("SELECT id, name, description, latitude, longitude, radius, deleted FROM objects ORDER BY name");
$objects = $stmt->fetchAll(PDO::FETCH_ASSOC);
?>
<!DOCTYPE html>
<html lang="et">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Halda objekte</title>
  <!-- Bootstrap 5 CSS -->
  <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet">
  <!-- DataTables CSS -->
  <link rel="stylesheet" href="https://cdn.datatables.net/1.13.4/css/dataTables.bootstrap5.min.css">
  <!-- Bootstrap Icons (valikuline) -->
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.10.5/font/bootstrap-icons.css">
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
    .table-responsive {
      margin-bottom: 20px;
    }
    footer {
      background: #fff;
      padding: 1rem 0;
      text-align: center;
      margin-top: auto;
      box-shadow: 0 -2px 6px rgba(0,0,0,0.1);
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
  <!-- Navbar -->
  <nav class="navbar navbar-expand-lg navbar-light bg-white shadow-sm mb-4">
    <div class="container d-flex justify-content-between align-items-center">
      <a href="dashboard.php" class="d-flex align-items-center text-decoration-none">
        <img src="img/tarmel.jpg" alt="Ettevõtte logo" style="height:50px; margin-right:10px;">
        <span class="fs-4 fw-bold text-dark">TarMel Ehitus</span>
      </a>
      <div>
        <a href="logout.php" class="btn btn-danger">Logi välja</a>
      </div>
    </div>
  </nav>
  
  <!-- Peamine sisu -->
  <div class="container">
    <div class="card p-4 mb-4">
      <h1 class="mb-4 text-center">Objektide haldamine</h1>
      <a href="admin_add_object.php" class="btn btn-primary mb-3">
        <i class="bi bi-plus-circle"></i> Lisa uus objekt
      </a>
      <div class="table-responsive">
        <table id="objectsTable" class="table table-bordered table-striped">
          <thead class="table-light">
            <tr>
              <th>ID</th>
              <th>Nimi</th>
              <th>Kirjeldus</th>
              <th>Latitude</th>
              <th>Longitude</th>
              <th>Raadius (m)</th>
              <th>Seisund</th>
              <th>Tegevused</th>
            </tr>
          </thead>
          <tbody>
            <?php foreach ($objects as $obj): ?>
              <tr>
                <td><?php echo htmlspecialchars($obj['id']); ?></td>
                <td><?php echo htmlspecialchars($obj['name']); ?></td>
                <td><?php echo htmlspecialchars($obj['description']); ?></td>
                <td><?php echo htmlspecialchars($obj['latitude']); ?></td>
                <td><?php echo htmlspecialchars($obj['longitude']); ?></td>
                <td><?php echo htmlspecialchars($obj['radius']); ?></td>
                <td><?php echo $obj['deleted'] ? 'Deaktiveeritud' : 'Aktiivne'; ?></td>
                <td>
                  <a href="admin_edit_object.php?id=<?php echo $obj['id']; ?>" class="btn btn-sm btn-warning" data-bs-toggle="tooltip" title="Muuda objekti">
                    Muuda
                  </a>
                  <?php if (!$obj['deleted']): ?>
                    <button type="button" class="btn btn-sm btn-secondary deactivateBtn" data-object-id="<?php echo $obj['id']; ?>" data-object-name="<?php echo htmlspecialchars($obj['name']); ?>" data-bs-toggle="tooltip" title="Deaktiveeri objekt">
                      Deaktiveeri
                    </button>
                  <?php else: ?>
                    <button type="button" class="btn btn-sm btn-success activateBtn" data-object-id="<?php echo $obj['id']; ?>" data-object-name="<?php echo htmlspecialchars($obj['name']); ?>" data-bs-toggle="tooltip" title="Aktiveeri objekt">
                      Aktiveeri
                    </button>
                  <?php endif; ?>
                  <button type="button" class="btn btn-sm btn-danger deleteBtn" data-object-id="<?php echo $obj['id']; ?>" data-object-name="<?php echo htmlspecialchars($obj['name']); ?>" data-bs-toggle="tooltip" title="Kustuta objekt">
                    Kustuta
                  </button>
                </td>
              </tr>
            <?php endforeach; ?>
          </tbody>
        </table>
      </div>
      <a href="dashboard.php" class="btn btn-outline-secondary mt-3">Tagasi Dashboardile</a>
    </div>
  </div>
  
  <!-- Modaalid -->
  <!-- Deaktiveeri Modal -->
  <div class="modal fade" id="deactivateModal" tabindex="-1" aria-labelledby="deactivateModalLabel" aria-hidden="true">
    <div class="modal-dialog modal-dialog-centered">
      <div class="modal-content">
        <div class="modal-header">
          <h5 class="modal-title" id="deactivateModalLabel">Deaktiveeri objekt</h5>
          <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Sulge"></button>
        </div>
        <div class="modal-body">
          Kas oled kindel, et soovid deaktiveerida objekti <strong id="deactivateModalObjectName"></strong>?
        </div>
        <div class="modal-footer">
          <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Tühista</button>
          <button type="button" class="btn btn-danger" id="confirmDeactivateBtn">Deaktiveeri</button>
        </div>
      </div>
    </div>
  </div>
  
  <!-- Aktiveeri Modal -->
  <div class="modal fade" id="activateModal" tabindex="-1" aria-labelledby="activateModalLabel" aria-hidden="true">
    <div class="modal-dialog modal-dialog-centered">
      <div class="modal-content">
        <div class="modal-header">
          <h5 class="modal-title" id="activateModalLabel">Aktiveeri objekt</h5>
          <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Sulge"></button>
        </div>
        <div class="modal-body">
          Kas oled kindel, et soovid aktiveerida objekti <strong id="activateModalObjectName"></strong>?
        </div>
        <div class="modal-footer">
          <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Tühista</button>
          <button type="button" class="btn btn-success" id="confirmActivateBtn">Aktiveeri</button>
        </div>
      </div>
    </div>
  </div>
  
  <!-- Kustuta Modal -->
  <div class="modal fade" id="deleteModal" tabindex="-1" aria-labelledby="deleteModalLabel" aria-hidden="true">
    <div class="modal-dialog modal-dialog-centered">
      <div class="modal-content">
        <div class="modal-header">
          <h5 class="modal-title" id="deleteModalLabel">Kustuta objekt</h5>
          <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Sulge"></button>
        </div>
        <div class="modal-body">
          Kas oled kindel, et soovid objekti <strong id="deleteModalObjectName"></strong> kustutada lõplikult?
        </div>
        <div class="modal-footer">
          <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Tühista</button>
          <button type="button" class="btn btn-danger" id="confirmDeleteBtn">Kustuta</button>
        </div>
      </div>
    </div>
  </div>
  
  <!-- Jalus -->
  <footer>
    <div class="container">
      <small>&copy; <?php echo date("Y"); ?> GretMar. Kõik õigused kaitstud.</small>
    </div>
  </footer>
  
  <!-- Skriptid -->
  <!-- jQuery (DataTables dependency) -->
  <script src="https://code.jquery.com/jquery-3.6.0.min.js"></script>
  <!-- Bootstrap 5 JS Bundle -->
  <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/js/bootstrap.bundle.min.js"></script>
  <!-- DataTables JS -->
  <script src="https://cdn.datatables.net/1.13.4/js/jquery.dataTables.min.js"></script>
  <script src="https://cdn.datatables.net/1.13.4/js/dataTables.bootstrap5.min.js"></script>
  <script>
    // DataTables initialization
    $(document).ready(function() {
      $('#objectsTable').DataTable({
          "order": [[ 1, "asc" ]],
          "lengthMenu": [ 10, 25, 50, 100 ],
          "language": {
              "url": "//cdn.datatables.net/plug-ins/1.13.4/i18n/Estonian.json"
          }
      });
      
      // Aktiveeri tooltipid
      var tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'));
      tooltipTriggerList.forEach(function(tooltipTriggerEl) {
        new bootstrap.Tooltip(tooltipTriggerEl);
      });
    });
    
    // Deaktiveeri nupu event listenerid
    document.querySelectorAll('.deactivateBtn').forEach(function(button) {
      button.addEventListener('click', function() {
        var objectId = this.getAttribute('data-object-id');
        var objectName = this.getAttribute('data-object-name');
        document.getElementById('deactivateModalObjectName').textContent = objectName;
        document.getElementById('confirmDeactivateBtn').onclick = function() {
          window.location.href = 'admin_deactivate_object.php?id=' + objectId;
        };
        var deactivateModal = new bootstrap.Modal(document.getElementById('deactivateModal'));
        deactivateModal.show();
      });
    });
    
    // Aktiveeri nupu event listenerid
    document.querySelectorAll('.activateBtn').forEach(function(button) {
      button.addEventListener('click', function() {
        var objectId = this.getAttribute('data-object-id');
        var objectName = this.getAttribute('data-object-name');
        document.getElementById('activateModalObjectName').textContent = objectName;
        document.getElementById('confirmActivateBtn').onclick = function() {
          window.location.href = 'admin_activate_object.php?id=' + objectId;
        };
        var activateModal = new bootstrap.Modal(document.getElementById('activateModal'));
        activateModal.show();
      });
    });
    
    // Kustuta nupu event listenerid
    document.querySelectorAll('.deleteBtn').forEach(function(button) {
      button.addEventListener('click', function() {
        var objectId = this.getAttribute('data-object-id');
        var objectName = this.getAttribute('data-object-name');
        document.getElementById('deleteModalObjectName').textContent = objectName;
        document.getElementById('confirmDeleteBtn').onclick = function() {
          window.location.href = 'admin_delete_object.php?id=' + objectId;
        };
        var deleteModal = new bootstrap.Modal(document.getElementById('deleteModal'));
        deleteModal.show();
      });
    });
  </script>
</body>
</html>
