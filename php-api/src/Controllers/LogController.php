<?php
namespace Edms\Api\Controllers;

use Edms\Api\Database;
use Edms\Api\Response;
use Edms\Api\Auth;

class LogController {
    public function getLogs(): void {
        Auth::requireAuth();
        $db = Database::getInstance();
        $limit = min(100, max(1, (int)($_GET['limit'] ?? 50)));
        $logs = $db->fetchAll("SELECT * FROM system_logs ORDER BY id DESC LIMIT {$limit}");
        Response::success($logs);
    }

    public function createLog(): void {
        $user = Auth::getCurrentUser();
        $input = json_decode(file_get_contents('php://input'), true) ?? $_POST;

        $db = Database::getInstance();
        $id = $db->insert('system_logs', [
            'user_id' => $user['id'] ?? 0,
            'username' => $user['username'] ?? ($input['username'] ?? 'system'),
            'action' => $input['action'] ?? 'ACTIVITY',
            'details' => $input['details'] ?? ($input['message'] ?? ''),
            'created_at' => date('Y-m-d H:i:s'),
        ]);

        Response::success(['id' => $id]);
    }
}
