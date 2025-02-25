<?php
error_reporting(E_ALL);
ini_set('display_errors', 1);

session_start();
if (!isset($_SESSION['user_id']) || $_SESSION['role'] !== 'admin') {
    header('Location: login.php');
    exit;
}

require_once '../config/config.php';
$pdo = getDBConnection();

// Võta filtrid GET parameetritest
$filter_object    = $_GET['object'] ?? '';
$filter_employee  = $_GET['employee'] ?? '';
$filter_date_from = $_GET['date_from'] ?? '';
$filter_date_to   = $_GET['date_to'] ?? '';

// Ehita SQL päring, sarnaselt aruande lehele
$query = "SELECT tl.*, o.name AS object_name, u.username, u.hourly_rate 
          FROM time_logs tl 
          JOIN objects o ON tl.object_id = o.id
          JOIN users u ON tl.user_id = u.id
          WHERE 1=1";
$params = [];
if (!empty($filter_object)) {
    $query .= " AND tl.object_id = ?";
    $params[] = $filter_object;
}
if (!empty($filter_employee)) {
    $query .= " AND tl.user_id = ?";
    $params[] = $filter_employee;
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

// Kogu HTML väljund PDF jaoks
ob_start();
?>
<!DOCTYPE html>
<html lang="et">
<head>
    <meta charset="UTF-8">
    <title>Tööajaaruanne PDF</title>
    <style>
        body { font-family: DejaVu Sans, sans-serif; font-size: 12px; }
        h1 { text-align: center; }
        table { width: 100%; border-collapse: collapse; margin-top: 20px; }
        th, td { border: 1px solid #333; padding: 6px; text-align: left; }
        th { background-color: #eee; }
    </style>
</head>
<body>
    <h1>Tööajaaruanne</h1>
    <table>
        <thead>
            <tr>
                <th>Töötaja</th>
                <th>Objekt</th>
                <th>Alustas</th>
                <th>Lõppes</th>
                <th>Töötunnid</th>
                <th>Tulu (€)</th>
                <th>Kommentaar</th>
            </tr>
        </thead>
        <tbody>
            <?php foreach ($logs as $log): ?>
                <?php 
                    if ($log['end_time']) {
                        $duration = (strtotime($log['end_time']) - strtotime($log['start_time'])) / 3600;
                        $durationRounded = round($duration, 2);
                        $earnings = round($duration * $log['hourly_rate'], 2);
                    } else {
                        $durationRounded = 'Aktiivne';
                        $earnings = '-';
                    }
                ?>
                <tr>
                    <td><?php echo htmlspecialchars($log['username']); ?></td>
                    <td><?php echo htmlspecialchars($log['object_name']); ?></td>
                    <td><?php echo date("Y-m-d H:i:s", strtotime($log['start_time'])); ?></td>
                    <td><?php echo $log['end_time'] ? date("Y-m-d H:i:s", strtotime($log['end_time'])) : 'Aktiivne'; ?></td>
                    <td><?php echo $durationRounded; ?></td>
                    <td><?php echo $earnings; ?></td>
                    <td><?php echo htmlspecialchars($log['comment']); ?></td>
                </tr>
            <?php endforeach; ?>
        </tbody>
    </table>
</body>
</html>
<?php
$html = ob_get_clean();

// Laadime Composer autoloader – veendu, et tee on õige
require '../vendor/autoload.php';

// Määra mPDF jaoks ajutise failide kataloog väljaspool vendor/ kausta (näiteks projekti juurkataloogis tmp/)
$tempDir = __DIR__ . '/../tmp';
if (!is_dir($tempDir)) {
    mkdir($tempDir, 0775, true);
}
$mpdfConfig = [
    'tempDir' => $tempDir
];

$mpdf = new \Mpdf\Mpdf($mpdfConfig);
$mpdf->WriteHTML($html);
$filename = 'tööajaaruanne_' . date('Y-m-d_H-i-s') . '.pdf';
$mpdf->Output($filename, \Mpdf\Output\Destination::INLINE);
exit;
?>
