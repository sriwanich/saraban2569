<?php
namespace Edms\Api\Controllers;

use Edms\Api\Database;
use Edms\Api\Response;
use Edms\Api\Auth;

class DocumentController {
    /**
     * ดึงรายการเอกสารพร้อมระบบค้นหา กรองหมวดหมู่ และ Pagination
     */
    public function getDocuments(): void {
        $type = $_GET['type'] ?? 'inbox';
        $search = $_GET['search'] ?? '';
        $department = $_GET['department'] ?? '';
        $status = $_GET['status'] ?? '';
        $page = max(1, (int)($_GET['page'] ?? 1));
        $limit = min(100, max(1, (int)($_GET['limit'] ?? 20)));
        $offset = ($page - 1) * $limit;

        $tableMap = [
            'inbox' => 'inbox_documents',
            'outbox' => 'outbox_documents',
            'internal' => 'internal_documents',
            'circular' => 'circular_documents',
            'admin' => 'admin_documents',
            'draft' => 'draft_documents',
        ];

        $table = $tableMap[$type] ?? 'inbox_documents';
        $db = Database::getInstance();
        $isPgsql = $db->isPostgres();

        $where = ['1=1'];
        $params = [];

        // Filter out soft deleted records unless requested
        if ($type !== 'draft') {
            $where[] = "is_deleted = 0" . ($isPgsql ? '::boolean' : '');
        }

        if ($search) {
            $likeOp = $isPgsql ? 'ILIKE' : 'LIKE';
            $where[] = "(title {$likeOp} :s1 OR doc_number {$likeOp} :s2 OR from_source {$likeOp} :s3)";
            $params[':s1'] = "%{$search}%";
            $params[':s2'] = "%{$search}%";
            $params[':s3'] = "%{$search}%";
        }

        if ($department) {
            $where[] = "department = :dept";
            $params[':dept'] = $department;
        }

        if ($status) {
            $where[] = "status = :st";
            $params[':st'] = $status;
        }

        $whereSql = implode(' AND ', $where);

        // Count total
        $countRow = $db->fetchOne("SELECT COUNT(*) as total FROM {$table} WHERE {$whereSql}", $params);
        $total = (int)($countRow['total'] ?? 0);

        // Fetch records
        $sql = "SELECT * FROM {$table} WHERE {$whereSql} ORDER BY created_at DESC LIMIT {$limit} OFFSET {$offset}";
        $items = $db->fetchAll($sql, $params);

        // Parse JSON fields
        foreach ($items as &$item) {
            if (isset($item['attachments']) && is_string($item['attachments'])) {
                $item['attachments'] = json_decode($item['attachments'], true) ?? [];
            }
        }

        Response::success($items, 'ดึงข้อมูลเอกสารสำเร็จ', [
            'total' => $total,
            'page' => $page,
            'limit' => $limit,
            'total_pages' => ceil($total / $limit),
            'type' => $type,
        ]);
    }

    /**
     * ดึงรายละเอียดเอกสารพร้อมประวัติการเกษียรและการเดินเรื่อง
     */
    public function getDocumentById(string|int $id): void {
        $type = $_GET['type'] ?? 'inbox';
        $tableMap = [
            'inbox' => 'inbox_documents',
            'outbox' => 'outbox_documents',
            'internal' => 'internal_documents',
            'circular' => 'circular_documents',
            'admin' => 'admin_documents',
            'draft' => 'draft_documents',
        ];
        $table = $tableMap[$type] ?? 'inbox_documents';

        $db = Database::getInstance();
        $doc = $db->fetchOne("SELECT * FROM {$table} WHERE id = :id LIMIT 1", [':id' => $id]);

        if (!$doc) {
            Response::notFound('ไม่พบข้อมูลเอกสาร');
        }

        if (isset($doc['attachments']) && is_string($doc['attachments'])) {
            $doc['attachments'] = json_decode($doc['attachments'], true) ?? [];
        }

        // Fetch routes/tracking
        $routes = $db->fetchAll("SELECT * FROM document_tracking WHERE doc_id = :id ORDER BY id ASC", [':id' => (string)$id]);
        $doc['routes'] = $routes;

        // Fetch digital signatures
        $sigs = $db->fetchAll("SELECT * FROM digital_signatures WHERE doc_number = :docNum ORDER BY id DESC", [':docNum' => $doc['doc_number'] ?? '']);
        $doc['signatures'] = $sigs;

        Response::success($doc);
    }

    /**
     * สร้างเอกสารใหม่ (Inbox / Outbox / Internal / Circular / Admin)
     */
    public function createDocument(): void {
        $user = Auth::requireAuth();
        $input = json_decode(file_get_contents('php://input'), true) ?? $_POST;

        $type = $input['type'] ?? 'internal';
        $tableMap = [
            'inbox' => 'inbox_documents',
            'outbox' => 'outbox_documents',
            'internal' => 'internal_documents',
            'circular' => 'circular_documents',
            'admin' => 'admin_documents',
            'draft' => 'draft_documents',
        ];
        $table = $tableMap[$type] ?? 'internal_documents';

        $title = trim($input['title'] ?? '');
        if (!$title) {
            Response::error('กรุณาระบุชื่อเรื่องของเอกสาร', 422);
        }

        $db = Database::getInstance();
        $docNumber = $input['doc_number'] ?? $input['docNumber'] ?? $this->generateNextDocNumber($type);
        $id = $input['id'] ?? ('doc_' . time() . '_' . substr(bin2hex(random_bytes(3)), 0, 6));

        $data = [
            'id' => $id,
            'doc_number' => $docNumber,
            'title' => $title,
            'doc_date' => $input['doc_date'] ?? $input['docDate'] ?? date('Y-m-d'),
            'from_source' => $input['from_source'] ?? $input['fromDept'] ?? ($user['department'] ?? 'กลุ่มงานยุทธศาสตร์และการจัดการ'),
            'to_destination' => $input['to_destination'] ?? $input['toDept'] ?? '',
            'urgency' => $input['urgency'] ?? $input['priority'] ?? 'ปกติ',
            'secrecy' => $input['secrecy'] ?? 'ปกติ',
            'status' => $input['status'] ?? 'pending',
            'department' => $input['department'] ?? ($user['department'] ?? ''),
            'assignee' => $input['assignee'] ?? '',
            'notes' => $input['notes'] ?? $input['note'] ?? '',
            'content' => $input['content'] ?? '',
            'attachments' => is_array($input['attachments'] ?? null) ? json_encode($input['attachments']) : ($input['attachments'] ?? '[]'),
            'created_by' => $user['username'],
            'created_at' => date('Y-m-d H:i:s'),
            'updated_at' => date('Y-m-d H:i:s'),
        ];

        if ($type === 'inbox') {
            $data['receive_number'] = $input['receive_number'] ?? $input['receiveNumber'] ?? $this->generateReceiveNumber();
            $data['receive_date'] = $input['receive_date'] ?? date('Y-m-d');
            $data['receive_time'] = $input['receive_time'] ?? date('H:i');
        }

        if ($type === 'admin') {
            $data['category'] = $input['category'] ?? 'order';
            $data['year'] = (string)((int)date('Y') + 543);
        }

        $db->insert($table, $data);

        // Add creation tracking record
        try {
            $db->insert('document_tracking', [
                'doc_id' => $id,
                'doc_type' => $type,
                'action' => 'CREATED',
                'actor' => $user['username'],
                'actor_role' => $user['role'] ?? 'user',
                'comment' => 'สร้างเอกสารในระบบสารบรรณ Enterprise',
                'created_at' => date('Y-m-d H:i:s'),
            ]);

            $db->insert('system_logs', [
                'username' => $user['username'],
                'action' => 'CREATE_DOCUMENT',
                'details' => "สร้างเอกสารประเภท [{$type}] เลขที่ {$docNumber} เรื่อง: {$title}",
                'module' => 'DOCUMENT',
                'ip_address' => $_SERVER['REMOTE_ADDR'] ?? '127.0.0.1'
            ]);
        } catch (\Throwable $e) {}

        Response::success(['id' => $id, 'doc_number' => $docNumber], 'บันทึกเอกสารสำเร็จ');
    }

    /**
     * อัปเดตข้อมูลเอกสารหรือเปลี่ยนสถานะ
     */
    public function updateDocument(string $id): void {
        $user = Auth::requireAuth();
        $input = json_decode(file_get_contents('php://input'), true) ?? $_POST;
        $type = $input['type'] ?? $_GET['type'] ?? 'inbox';

        $tableMap = [
            'inbox' => 'inbox_documents',
            'outbox' => 'outbox_documents',
            'internal' => 'internal_documents',
            'circular' => 'circular_documents',
            'admin' => 'admin_documents',
        ];
        $table = $tableMap[$type] ?? 'inbox_documents';

        $db = Database::getInstance();
        $existing = $db->fetchOne("SELECT * FROM {$table} WHERE id = :id LIMIT 1", [':id' => $id]);
        if (!$existing) {
            Response::notFound('ไม่พบข้อมูลเอกสาร');
        }

        $allowedFields = ['title', 'status', 'urgency', 'secrecy', 'department', 'assignee', 'notes', 'content', 'to_destination', 'from_source'];
        $updateData = ['updated_at' => date('Y-m-d H:i:s')];

        foreach ($allowedFields as $field) {
            if (isset($input[$field])) {
                $updateData[$field] = $input[$field];
            }
        }

        if (isset($input['attachments'])) {
            $updateData['attachments'] = is_array($input['attachments']) ? json_encode($input['attachments']) : $input['attachments'];
        }

        $db->update($table, $updateData, 'id = :id', [':id' => $id]);

        // Tracking action
        try {
            $action = $input['action'] ?? 'UPDATED';
            $db->insert('document_tracking', [
                'doc_id' => $id,
                'doc_type' => $type,
                'action' => $action,
                'actor' => $user['username'],
                'actor_role' => $user['role'] ?? 'user',
                'comment' => $input['comment'] ?? "อัปเดตสถานะเป็น " . ($input['status'] ?? 'ดำเนินการ'),
                'created_at' => date('Y-m-d H:i:s'),
            ]);
        } catch (\Throwable $e) {}

        Response::success([], 'อัปเดตข้อมูลเอกสารสำเร็จ');
    }

    /**
     * ลบเอกสาร (Soft-delete ไปยังคลังกู้คืน Recycle Bin)
     */
    public function deleteDocument(string $id): void {
        $user = Auth::requireAuth();
        $type = $_GET['type'] ?? 'inbox';

        $tableMap = [
            'inbox' => 'inbox_documents',
            'outbox' => 'outbox_documents',
            'internal' => 'internal_documents',
            'circular' => 'circular_documents',
            'admin' => 'admin_documents',
        ];
        $table = $tableMap[$type] ?? 'inbox_documents';

        $db = Database::getInstance();
        $isPgsql = $db->isPostgres();

        $updateData = [
            'is_deleted' => $isPgsql ? true : 1,
            'deleted_at' => date('Y-m-d H:i:s')
        ];

        $db->update($table, $updateData, 'id = :id', [':id' => $id]);

        // Audit Log
        try {
            $db->insert('system_logs', [
                'username' => $user['username'],
                'action' => 'DELETE_DOCUMENT',
                'details' => "ย้ายเอกสาร ID: {$id} ประเภท [{$type}] ไปยังถังขยะ",
                'module' => 'RECYCLE_BIN',
                'ip_address' => $_SERVER['REMOTE_ADDR'] ?? '127.0.0.1'
            ]);
        } catch (\Throwable $e) {}

        Response::success([], 'ย้ายเอกสารไปยังคลังกู้คืนเรียบร้อยแล้ว');
    }

    /**
     * ดึงรายการเลขที่จองไว้
     */
    public function getReservedNumbers(): void {
        $db = Database::getInstance();
        $rows = $db->fetchAll("SELECT * FROM reserved_numbers ORDER BY id DESC LIMIT 100");
        Response::success($rows);
    }

    private function generateNextDocNumber(string $type): string {
        $db = Database::getInstance();
        $year = (int)date('Y') + 543;
        $table = $type === 'outbox' ? 'outbox_documents' : 'internal_documents';

        $last = $db->fetchOne("SELECT doc_number FROM {$table} ORDER BY created_at DESC LIMIT 1");
        $nextSeq = 1;
        if ($last && preg_match('/\/(\d+)$/', $last['doc_number'] ?? '', $m)) {
            $nextSeq = ((int)$m[1]) + 1;
        }

        return sprintf("รย 0021/%04d", $nextSeq);
    }

    private function generateReceiveNumber(): string {
        $db = Database::getInstance();
        $last = $db->fetchOne("SELECT receive_number FROM inbox_documents ORDER BY created_at DESC LIMIT 1");
        $nextSeq = 1;
        if ($last && is_numeric($last['receive_number'])) {
            $nextSeq = ((int)$last['receive_number']) + 1;
        }
        return (string)$nextSeq;
    }
}
