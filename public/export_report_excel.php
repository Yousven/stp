<?php
session_start();
if (!isset($_SESSION['user_id']) || $_SESSION['role'] !== 'admin') {
    header("Location: login.php");
    exit;
}

require_once '../config/config.php';
$pdo = getDBConnection();

// Filtrid GET parameetritest
$filter_object = $_GET['object'] ?? '';
$filter_employee = $_GET['employee'] ?? '';
$filter_date_from = $_GET['date_from'] ?? '';
$filter_date_to   = $_GET['date_to'] ?? '';

// Ehita päring, sarnane admin_report.php-ga
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

// Laadime PHPSpreadsheet – asume, et vendor kaust asub ühe taseme võrra ülespoole
require '../vendor/autoload.php';

use PhpOffice\PhpSpreadsheet\Spreadsheet;
use PhpOffice\PhpSpreadsheet\Writer\Xlsx;

$spreadsheet = new Spreadsheet();
$sheet = $spreadsheet->getActiveSheet();

// Lisa päisaread
$sheet->setCellValue('A1', 'Töötaja');
$sheet->setCellValue('B1', 'Objekt');
$sheet->setCellValue('C1', 'Alustas');
$sheet->setCellValue('D1', 'Lõppes');
$sheet->setCellValue('E1', 'Brutotunnid');
$sheet->setCellValue('F1', 'Lõuna (tunnid)');
$sheet->setCellValue('G1', 'Netotunnid');
$sheet->setCellValue('H1', 'Tulu (€)');
$sheet->setCellValue('I1', 'Kommentaar');

$rowNum = 2;
foreach ($logs as $log) {
    if ($log['end_time']) {
        $gross = (strtotime($log['end_time']) - strtotime($log['start_time'])) / 3600;
        $grossRounded = round($gross, 2);
        $lunch = (float)$log['lunch'];
        $net = $gross - $lunch;
        $netRounded = round($net, 2);
        $earnings = round($net * $log['hourly_rate'], 2);
    } else {
        $grossRounded = '';
        $lunch = '';
        $netRounded = '';
        $earnings = '';
    }
    $sheet->setCellValue("A{$rowNum}", $log['username']);
    $sheet->setCellValue("B{$rowNum}", $log['object_name']);
    $sheet->setCellValue("C{$rowNum}", date("Y-m-d H:i:s", strtotime($log['start_time'])));
    $sheet->setCellValue("D{$rowNum}", $log['end_time'] ? date("Y-m-d H:i:s", strtotime($log['end_time'])) : 'Aktiivne');
    $sheet->setCellValue("E{$rowNum}", $grossRounded);
    $sheet->setCellValue("F{$rowNum}", $lunch);
    $sheet->setCellValue("G{$rowNum}", $netRounded);
    $sheet->setCellValue("H{$rowNum}", $earnings);
    $sheet->setCellValue("I{$rowNum}", $log['comment']);
    $rowNum++;
}

// Ekspordi fail Excelina
$writer = new Xlsx($spreadsheet);
$filename = 'tööajaaruanne_' . date('Y-m-d_H-i-s') . '.xlsx';

header('Content-Type: application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
header("Content-Disposition: attachment; filename=\"{$filename}\"");
header('Cache-Control: max-age=0');
$writer->save('php://output');
exit;
?>
