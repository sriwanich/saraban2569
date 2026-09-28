<?php
namespace Edms\Api\Controllers;

use Edms\Api\Database;
use Edms\Api\Response;
use Edms\Api\Auth;

class WorkflowController {
    public function getWorkflowInstances(): void {
        Auth::requireAuth();
        $db = Database::getInstance();
        $items = $db->fetchAll("SELECT * FROM workflow_instances ORDER BY id DESC LIMIT 50");
        Response::success($items);
    }

    public function addStep(): void {
        $user = Auth::requireAuth();
        $input = json_decode(file_get_contents('php://input'), true) ?? $_POST;

        $docId = $input['doc_id'] ?? null;
        $docType = $input['doc_type'] ?? 'internal';
        $action = $input['action'] ?? 'FORWARD';
        $comment = $input['comment'] ?? '';
        $toUser = $input['to_user'] ?? '';

        if (!$docId) {
            Response::error('ระบุรหัสเอกสารไม่ถูกต้อง', 422);
        }

        $db = Database::getInstance();
        $trackId = $db->insert('document_tracking', [
            'doc_id' => $docId,
            'doc_type' => $docType,
            'action' => $action,
            'actor' => $user['username'],
            'comment' => $comment,
            'created_at' => date('Y-m-d H:i:s'),
        ]);

        Response::success(['id' => $trackId], 'บันทึกขั้นตอนการเดินหนังสือ (เกษียร/ส่งต่อ) สำเร็จ');
    }
}
