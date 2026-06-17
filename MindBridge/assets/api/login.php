<?php
// api/login.php
declare(strict_types=1);
header('Content-Type: application/json; charset=utf-8');

require __DIR__ . '/../config/db.php';

// Aceita apenas POST
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    exit(json_encode(['erro' => 'Método não permitido']));
}

$dados = json_decode(file_get_contents('php://input'), true);
$email = trim($dados['email'] ?? '');
$senha = $dados['password'] ?? '';
$lembrar = !empty($dados['lembrar']);

// Validação básica
if (!filter_var($email, FILTER_VALIDATE_EMAIL) || strlen($senha) < 6) {
    http_response_code(400);
    exit(json_encode(['erro' => 'E-mail ou senha inválidos.']));
}

// Proteção contra força bruta: máximo 5 tentativas em 15 min
$ip = $_SERVER['REMOTE_ADDR'] ?? '0.0.0.0';
$stmt = $pdo->prepare("
    SELECT COUNT(*) FROM logins_tentativas
    WHERE ip = :ip AND sucesso = 0 AND tentado_em > NOW() - INTERVAL 15 MINUTE
");
$stmt->execute([':ip' => $ip]);
if ((int)$stmt->fetchColumn() >= 5) {
    http_response_code(429);
    exit(json_encode(['erro' => 'Muitas tentativas. Aguarde alguns minutos.']));
}

// Busca o usuário
$stmt = $pdo->prepare("SELECT id, nome, senha_hash FROM usuarios WHERE email = :email AND ativo = 1");
$stmt->execute([':email' => $email]);
$usuario = $stmt->fetch();

$loginOk = $usuario && password_verify($senha, $usuario['senha_hash']);

// Registra a tentativa
$stmt = $pdo->prepare("INSERT INTO logins_tentativas (email, ip, sucesso) VALUES (:e, :i, :s)");
$stmt->execute([':e' => $email, ':i' => $ip, ':s' => $loginOk ? 1 : 0]);

if (!$loginOk) {
    http_response_code(401);
    exit(json_encode(['erro' => 'Credenciais inválidas.']));
}

// Inicia sessão PHP
session_start();
session_regenerate_id(true);
$_SESSION['usuario_id'] = $usuario['id'];
$_SESSION['usuario_nome'] = $usuario['nome'];

// Se "Lembrar de mim": cria token de longa duração (30 dias)
if ($lembrar) {
    $token = bin2hex(random_bytes(64));
    $expira = date('Y-m-d H:i:s', strtotime('+30 days'));
    $ua = $_SERVER['HTTP_USER_AGENT'] ?? '';

    $stmt = $pdo->prepare("
        INSERT INTO sessoes (usuario_id, token, ip, user_agent, expira_em)
        VALUES (:u, :t, :i, :a, :e)
    ");
    $stmt->execute([
        ':u' => $usuario['id'],
        ':t' => hash('sha256', $token),
        ':i' => $ip,
        ':a' => $ua,
        ':e' => $expira,
    ]);

    setcookie('lembrar_token', $token, [
        'expires'  => strtotime('+30 days'),
        'path'     => '/',
        'httponly'  => true,
        'samesite' => 'Lax',
        // 'secure' => true,   // descomente em HTTPS
    ]);
}

echo json_encode([
    'sucesso' => true,
    'nome'    => $usuario['nome'],
    'redir'   => 'mindbridge-home.html',
]);