<?php
session_start();
if (isset($_SESSION['user_id'])) {
    header('Location: dashboard.php');
    exit;
}
$error = $_SESSION['error'] ?? '';
unset($_SESSION['error']); // Eemalda error, et seda ei kuvata uuesti
?>
<!DOCTYPE html>
<html lang="et">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Logi sisse</title>
  <!-- Bootstrap 5 CSS -->
  <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet">
  <!-- Favicons -->
  <link rel="icon" type="image/png" href="/img/favicon-96x96.png" sizes="96x96" />
  <link rel="icon" type="image/svg+xml" href="/img/favicon.svg" />
  <link rel="shortcut icon" href="/img/favicon.ico" />
  <link rel="apple-touch-icon" sizes="180x180" href="/img/apple-touch-icon.png" />
  <meta name="apple-mobile-web-app-title" content="GretMar" />
  <link rel="manifest" href="/img/site.webmanifest" />
  
  <!-- Custom CSS for modern design and animations -->
  <style>
    :root {
      --primary-color: #fda085;
      --secondary-color: #f6d365;
      --text-color: #333;
    }
    body {
      background: linear-gradient(135deg, var(--secondary-color) 0%, var(--primary-color) 100%);
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      margin: 0;
      font-family: 'Poppins', sans-serif;
    }
    .card {
      border: none;
      border-radius: 1rem;
      box-shadow: 0 8px 16px rgba(0,0,0,0.15);
      animation: fadeInUp 0.8s ease-out;
    }
    @keyframes fadeInUp {
      from { opacity: 0; transform: translateY(30px); }
      to { opacity: 1; transform: translateY(0); }
    }
    .form-floating > label {
      transition: all 0.2s ease-out;
    }
    .form-floating > .form-control:focus ~ label,
    .form-floating > .form-control:not(:placeholder-shown) ~ label {
      transform: scale(0.85) translateY(-1.5rem);
      opacity: 0.75;
    }
    button#loginBtn {
      transition: background-color 0.2s, transform 0.2s;
    }
    button#loginBtn:hover {
      transform: scale(1.02);
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="row justify-content-center">
      <div class="col-md-4 col-10">
        <div class="card p-4">
          <div class="card-body">
            <h2 class="card-title text-center mb-4" style="color: var(--text-color);">Logi sisse</h2>
            <?php if (!empty($error)): ?>
              <div class="alert alert-danger" role="alert">
                <?php echo htmlspecialchars($error); ?>
              </div>
            <?php endif; ?>
            <form action="authenticate.php" method="post">
              <div class="form-floating mb-3">
                <input type="text" name="username" class="form-control" id="username" placeholder="Kasutajanimi" required>
                <label for="username">Kasutajanimi</label>
              </div>
              <div class="form-floating mb-3">
                <input type="password" name="password" class="form-control" id="password" placeholder="Parool" required>
                <label for="password">Parool</label>
              </div>
              <button type="submit" class="btn btn-primary w-100" id="loginBtn">Logi sisse</button>
            </form>
            <div class="text-center mt-3">
              <a href="forgot_password.php" style="color: var(--text-color);">Unustasid parooli?</a>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>

  <!-- Bootstrap 5 JS Bundle -->
  <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/js/bootstrap.bundle.min.js"></script>
  <!-- Custom JS to add a loading spinner on submit -->
  <script>
    document.querySelector("form").addEventListener("submit", function(){
      var btn = document.getElementById("loginBtn");
      btn.disabled = true;
      btn.innerHTML = `<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Palun oota...`;
    });
  </script>
</body>
</html>
