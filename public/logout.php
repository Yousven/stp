<?php
error_log("logout.php: Algus. Sessiooni andmed: " . print_r($_SESSION, true));
session_start();
session_unset();
session_destroy();
error_log("logout.php: Sessioon lõpetatud.");
header("Location: login.php");
exit;
?>