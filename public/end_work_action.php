<?php
session_start();
if (!isset($_SESSION['user_id'])) {
    header('Location: login.php');
    exit;
}

require_once '../config/config.php';
$pdo = getDBConnection();

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $log_id  = $_POST['log_id'] ?? '';
    $comment = trim($_POST['comment'] ?? '');
    $travel_duration = (isset($_POST['travel_duration']) && trim($_POST['travel_duration']) !== '') ? trim($_POST['travel_duration']) : 0;
    $lunch = (isset($_POST['lunch']) && trim($_POST['lunch']) !== '') ? trim($_POST['lunch']) : 0;

    if ($log_id === '') {
        showModal("Viga", "Töölogi ID puudub.", "dashboard.php");
        exit;
    }
    
    $stmtCheck = $pdo->prepare("SELECT end_time FROM time_logs WHERE id = ?");
    $stmtCheck->execute([$log_id]);
    $log = $stmtCheck->fetch(PDO::FETCH_ASSOC);

    if (!$log || (!empty($log['end_time']))) {
        showModal("Tööpäev pole aktiivne", "Aktivset töölogi ei leitud. Tööpäev pole alustatud või on juba lõpetatud.", "dashboard.php");
        exit;
    }

    try {
        $stmt = $pdo->prepare("UPDATE time_logs SET end_time = NOW(), comment = ?, travel_duration = ?, lunch = ? WHERE id = ?");
        $stmt->execute([$comment, $travel_duration, $lunch, $log_id]);
        showModal("Töölogi uuendatud", "Teie töölogi on edukalt uuendatud.", "dashboard.php");
    } catch (Exception $e) {
        error_log("Töölogi uuendamise viga: " . $e->getMessage());
        http_response_code(500);
        showModal("Viga", "Töölogi uuendamisel tekkis viga.", "dashboard.php");
    }
    exit;
} else {
    header('Location: end_work.php');
    exit;
}

function showModal($title, $message, $redirectUrl) {
    ?>
    <!DOCTYPE html>
    <html lang="et">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <title><?php echo htmlspecialchars($title); ?></title>
        <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet">
        <style>
            body {
                background: linear-gradient(135deg, #f6d365, #fda085);
                min-height: 100vh;
                display: flex;
                align-items: center;
                justify-content: center;
                font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            }
            .modal-content {
                border-radius: 10px;
                box-shadow: 0 4px 10px rgba(0,0,0,0.25);
            }
        </style>
    </head>
    <body>
        <div class="modal fade show" id="customModal" tabindex="-1" aria-labelledby="customModalLabel" style="display:block;" aria-hidden="false">
            <div class="modal-dialog modal-dialog-centered">
                <div class="modal-content shadow">
                    <div class="modal-header">
                        <h5 class="modal-title" id="customModalLabel"><?php echo htmlspecialchars($title); ?></h5>
                    </div>
                    <div class="modal-body">
                        <?php echo htmlspecialchars($message); ?>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-primary" onclick="redirectToPage()">Tagasi Dashboardile</button>
                    </div>
                </div>
            </div>
        </div>
        <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/js/bootstrap.bundle.min.js"></script>
        <script>
            function redirectToPage() {
                window.location.href = "<?php echo htmlspecialchars($redirectUrl); ?>";
            }
        </script>
    </body>
    </html>
    <?php
}
?>
