<?php
session_start();
if (!isset($_SESSION['user_id']) || $_SESSION['role'] !== 'admin') {
    header("Location: login.php");
    exit;
}
require_once '../config/config.php';
$pdo = getDBConnection();

// Määrame kuu alguse ja lõpu
$startOfMonth = date("Y-m-01 00:00:00");
$endOfMonth = date("Y-m-t 23:59:59");

// Arvutame kuu tööpäevade arvu (esmaspäevast reedeni)
$startDate = new DateTime($startOfMonth);
$endDate = new DateTime($endOfMonth);
$endDate->modify('+1 day'); // lisame viimase päeva
$workingDays = 0;
$interval = new DateInterval('P1D');
$period = new DatePeriod($startDate, $interval, $endDate);
foreach ($period as $day) {
    if ($day->format('N') < 6) { // 1 = esmaspäev, ... , 5 = reede
        $workingDays++;
    }
}
$monthlyNorm = $workingDays * 8; // 8-tunnine tööpäev

// Küsime kõigi kasutajate kohta, kui palju tunde on kokku tehtud selle kuu jooksul
$query = "SELECT u.username, IFNULL(SUM(TIMESTAMPDIFF(SECOND, tl.start_time, tl.end_time))/3600, 0) AS hours
          FROM users u
          LEFT JOIN time_logs tl 
            ON u.id = tl.user_id 
            AND tl.end_time IS NOT NULL 
            AND tl.start_time BETWEEN ? AND ?
          GROUP BY u.id
          ORDER BY u.username";
$stmt = $pdo->prepare($query);
$stmt->execute([$startOfMonth, $endOfMonth]);
$data = $stmt->fetchAll(PDO::FETCH_ASSOC);

$usernames = [];
$hours = [];
$performanceData = []; // sisaldab kasutaja kaupa norm, tehtud tunnid ja protsentuaalne täitmine
$totalTeamHours = 0;
foreach ($data as $row) {
    $usernames[] = $row['username'];
    $actualHours = round($row['hours'], 2);
    $hours[] = $actualHours;
    $performance = $monthlyNorm > 0 ? round(($actualHours / $monthlyNorm) * 100, 2) : 0;
    $performanceData[] = [
        'username' => $row['username'],
        'norm' => $monthlyNorm,
        'actual' => $actualHours,
        'percent' => $performance
    ];
    $totalTeamHours += $actualHours;
}
$totalTeamHours = round($totalTeamHours, 2);
?>
<!DOCTYPE html>
<html lang="et">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Meeskonna tööaja ülevaade</title>
  <!-- Bootstrap 5 CSS -->
  <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet">
  <!-- Custom CSS -->
  <link rel="stylesheet" href="style.css">
  <!-- Chart.js -->
  <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
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
      flex: 1;
    }
    @keyframes fadeIn {
      from { opacity: 0; transform: translateY(10px); }
      to { opacity: 1; transform: translateY(0); }
    }
    footer {
      background: #fff;
      padding: 1rem 0;
      text-align: center;
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
  <div class="container py-4">
    <h1 class="mb-4 text-center">Meeskonna tööaja ülevaade (kuu)</h1>
    
    <div class="card shadow-sm p-4 mb-4">
      <canvas id="teamChart"></canvas>
    </div>
    
    <!-- Kokkuvõtte kaart -->
    <div class="card shadow-sm p-3 mb-4">
      <h4 class="text-center">Kokku töötunnid</h4>
      <p class="text-center fs-5"><?php echo $totalTeamHours; ?> tundi</p>
    </div>
    
    <!-- Performance tabel -->
    <div class="card shadow-sm p-4 mb-4">
      <h4 class="text-center mb-3">Kasutajate performance</h4>
      <div class="table-responsive">
        <table class="table table-bordered">
          <thead class="table-light">
            <tr>
              <th>Kasutaja</th>
              <th>Kuu norm (tundi)</th>
              <th>Tehtud tunnid</th>
              <th>Täitmine (%)</th>
            </tr>
          </thead>
          <tbody>
            <?php foreach ($performanceData as $perf): ?>
            <tr>
              <td><?php echo htmlspecialchars($perf['username']); ?></td>
              <td><?php echo $perf['norm']; ?></td>
              <td><?php echo $perf['actual']; ?></td>
              <td><?php echo $perf['percent']; ?>%</td>
            </tr>
            <?php endforeach; ?>
          </tbody>
        </table>
      </div>
    </div>
    
    <!-- Toimingute nupud -->
    <div class="d-grid gap-2 d-sm-flex justify-content-sm-center mb-4">
      <button type="button" id="downloadChartBtn" class="btn btn-outline-primary btn-lg" data-bs-toggle="tooltip" title="Laadi alla diagrammi pilt">Laadi alla pilt</button>
      <button type="button" class="btn btn-secondary btn-lg" onclick="window.print();" data-bs-toggle="tooltip" title="Prindi diagramm">Prindi</button>
      <button type="button" class="btn btn-info btn-lg" onclick="location.reload();" data-bs-toggle="tooltip" title="Uuenda andmeid">Uuenda andmeid</button>
    </div>
    
    <div class="text-center">
      <a href="dashboard.php" class="btn btn-outline-secondary">Tagasi Dashboardile</a>
    </div>
  </div>
  
  <!-- Footer -->
  <footer>
    <div class="container">
      <small>&copy; <?php echo date("Y"); ?> GretMar. Kõik õigused kaitstud.</small>
    </div>
  </footer>
  
  <script>
    // Initsialiseeri Chart.js diagramm
    const ctx = document.getElementById('teamChart').getContext('2d');
    const teamChart = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: <?php echo json_encode($usernames); ?>,
        datasets: [{
          label: 'Töötunnid',
          data: <?php echo json_encode($hours); ?>,
          backgroundColor: 'rgba(54, 162, 235, 0.6)',
          borderColor: 'rgba(54, 162, 235, 1)',
          borderWidth: 1,
          hoverBackgroundColor: 'rgba(54, 162, 235, 0.8)',
          hoverBorderColor: 'rgba(54, 162, 235, 1)'
        }]
      },
      options: {
        responsive: true,
        plugins: {
          legend: {
            display: true,
            position: 'top'
          },
          title: {
            display: true,
            text: 'Töötunnid selle kuu jooksul'
          },
          tooltip: {
            callbacks: {
              label: function(context) {
                return context.parsed.y + " tundi";
              }
            }
          }
        },
        scales: {
          y: {
            beginAtZero: true,
            title: {
              display: true,
              text: 'Töötunnid'
            }
          }
        }
      }
    });
    
    // Laadi alla pildi nupp – kasutab Chart.js toBase64Image meetodit
    document.getElementById('downloadChartBtn').addEventListener('click', function() {
      const url = teamChart.toBase64Image();
      const a = document.createElement('a');
      a.href = url;
      a.download = 'meeskonna_tootaeg.png';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    });
    
    // Aktiveeri tooltipid
    const tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'));
    tooltipTriggerList.forEach(function(tooltipTriggerEl) {
      new bootstrap.Tooltip(tooltipTriggerEl);
    });
  </script>
  <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/js/bootstrap.bundle.min.js"></script>
</body>
</html>
