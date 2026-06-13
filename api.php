<?php
// =============================================
// API - NED 2026 QR Code System
// =============================================

header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST');
header('Access-Control-Allow-Headers: Content-Type');

require_once 'config.php';

$action = $_GET['action'] ?? '';

switch ($action) {

    // ---- Gerar 20 QR Codes para um convidado ----
    case 'gerar':
        $input = json_decode(file_get_contents('php://input'), true);
        $nome = trim($input['nome'] ?? '');

        if (empty($nome)) {
            echo json_encode(['erro' => 'Nome do convidado é obrigatório.']);
            exit;
        }

        $db = getDB();

        // Inserir convidado
        $stmt = $db->prepare("INSERT INTO convidados (nome) VALUES (:nome)");
        $stmt->execute([':nome' => $nome]);
        $convidadoId = $db->lastInsertId();

        // Gerar numeração aleatória (1-999) sem repetição
        $numeros = range(100, 999);
        shuffle($numeros);
        $numeros = array_slice($numeros, 0, 20);

        // Gerar 20 códigos únicos
        $entradas = [];
        foreach ($numeros as $i => $numero) {
            $hash = strtoupper(substr(bin2hex(random_bytes(4)), 0, 8));
            $codigo = "NED2026-{$convidadoId}-{$numero}-{$hash}";

            $stmt = $db->prepare("INSERT INTO entradas (convidado_id, codigo, numero) VALUES (:cid, :cod, :num)");
            $stmt->execute([
                ':cid' => $convidadoId,
                ':cod' => $codigo,
                ':num' => $numero
            ]);

            $entradas[] = [
                'numero' => $numero,
                'codigo' => $codigo
            ];
        }

        // Ordenar por número
        usort($entradas, fn($a, $b) => $a['numero'] - $b['numero']);

        echo json_encode([
            'sucesso' => true,
            'convidado' => [
                'id' => (int)$convidadoId,
                'nome' => $nome
            ],
            'entradas' => $entradas
        ]);
        break;

    // ---- Validar QR Code (leitura) ----
    case 'validar':
        $input = json_decode(file_get_contents('php://input'), true);
        $codigo = trim($input['codigo'] ?? '');

        if (empty($codigo)) {
            echo json_encode(['erro' => 'Código QR é obrigatório.']);
            exit;
        }

        $db = getDB();

        // Buscar entrada
        $stmt = $db->prepare("
            SELECT e.*, c.nome AS convidado_nome
            FROM entradas e
            JOIN convidados c ON c.id = e.convidado_id
            WHERE e.codigo = :cod
            LIMIT 1
        ");
        $stmt->execute([':cod' => $codigo]);
        $entrada = $stmt->fetch();

        if (!$entrada) {
            echo json_encode([
                'status' => 'invalido',
                'mensagem' => '❌ QR Code inválido! Código não encontrado.'
            ]);
            exit;
        }

        if ($entrada['utilizado']) {
            echo json_encode([
                'status' => 'usado',
                'mensagem' => '⚠️ Entrada já utilizada!',
                'convidado' => $entrada['convidado_nome'],
                'numero' => $entrada['numero'],
                'utilizado_em' => $entrada['utilizado_em']
            ]);
            exit;
        }

        // Marcar como utilizado
        $stmt = $db->prepare("UPDATE entradas SET utilizado = 1, utilizado_em = NOW() WHERE id = :id");
        $stmt->execute([':id' => $entrada['id']]);

        echo json_encode([
            'status' => 'confirmado',
            'mensagem' => '✅ Presença Confirmada!',
            'convidado' => $entrada['convidado_nome'],
            'numero' => $entrada['numero']
        ]);
        break;

    // ---- Listar convidados ----
    case 'listar':
        $db = getDB();
        $stmt = $db->query("
            SELECT c.id, c.nome, c.criado_em,
                   COUNT(e.id) AS total_entradas,
                   SUM(e.utilizado) AS entradas_usadas
            FROM convidados c
            LEFT JOIN entradas e ON e.convidado_id = c.id
            GROUP BY c.id
            ORDER BY c.criado_em DESC
        ");
        $convidados = $stmt->fetchAll();

        echo json_encode(['convidados' => $convidados]);
        break;

    // ---- Buscar entradas de um convidado ----
    case 'entradas':
        $convidadoId = (int)($_GET['id'] ?? 0);
        if ($convidadoId <= 0) {
            echo json_encode(['erro' => 'ID do convidado inválido.']);
            exit;
        }

        $db = getDB();

        $stmt = $db->prepare("SELECT * FROM convidados WHERE id = :id");
        $stmt->execute([':id' => $convidadoId]);
        $convidado = $stmt->fetch();

        if (!$convidado) {
            echo json_encode(['erro' => 'Convidado não encontrado.']);
            exit;
        }

        $stmt = $db->prepare("SELECT * FROM entradas WHERE convidado_id = :cid ORDER BY numero");
        $stmt->execute([':cid' => $convidadoId]);
        $entradas = $stmt->fetchAll();

        echo json_encode([
            'convidado' => $convidado,
            'entradas' => $entradas
        ]);
        break;

    default:
        echo json_encode(['erro' => 'Ação inválida.']);
        break;
}
