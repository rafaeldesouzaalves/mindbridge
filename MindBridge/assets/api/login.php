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

// Validação básica de preenchimento
if (empty($email) || empty($senha)) {
    http_response_code(400);
    exit(json_encode(['erro' => 'E-mail e senha são obrigatórios.']));
}

// Busca o usuário comparando a senha diretamente na tabela 'users'
$stmt = $pdo->prepare("SELECT id, nome FROM users WHERE email = :email AND senha = :senha AND ativo = 1");
$stmt->execute([
    ':email' => $email,
    ':senha' => $senha
]);
$usuario = $stmt->fetch();


// Se não encontrar o usuário ou a senha estiver errada
if (!$usuario) {
    http_response_code(401);
    exit(json_encode(['erro' => 'Credenciais inválidas.']));
}

// Inicia sessão PHP
session_start();
session_regenerate_id(true);

$_SESSION['usuario_id'] = $usuario['id'];
$_SESSION['usuario_nome'] = $usuario['nome'];

// Retorno de sucesso
echo json_encode([
    'sucesso' => true,
    'nome' => $usuario['nome'],
    'redir' => 'mindbridge-home.html',
]);
