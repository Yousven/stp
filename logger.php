<?php
// logger.php
require_once __DIR__ . '/vendor/autoload.php';

use Monolog\Logger;
use Monolog\Handler\StreamHandler;

// Loo logija nimega 'app'
$log = new Logger('app');
// Lisa handler, mis kirjutab logid faili /logs/app.log
$log->pushHandler(new StreamHandler(__DIR__ . '/logs/app.log', Logger::DEBUG));

// Logime, et logija on initsialiseeritud
$log->info('Logger initsialiseeritud.');
