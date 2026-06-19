<?php
// config/db.php
declare(strict_types=1);

define('DB_HOST', 'p2.hcraft.online');
define('DB_NAME', 'login');
define('DB_USER', 'remoto');          // troque em produção
define('DB_PASS', 'ro8765');              // troque em produção
define('DB_CHARSET', 'utf8mb4');

try {
    $dsn = sprintf(
        'mysql:host=%s;dbname=%s;charset=%s',
        DB_HOST, DB_NAME, DB_CHARSET
    );

    $pdo = new PDO($dsn, DB_USER, DB_PASS, [
        PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        PDO::ATTR_EMULATE_PREPARES   => false,
    ]);
} catch (PDOException $e) {
    // Em produção: logar o erro, nunca mostrar ao usuário
    error_log('Erro de conexão: ' . $e->getMessage());
    http_response_code(500);
    exit(json_encode(['erro' => 'Falha ao conectar ao servidor.']));
}