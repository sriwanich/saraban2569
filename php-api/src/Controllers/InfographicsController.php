<?php
namespace Edms\Api\Controllers;

use Edms\Api\Database;
use Edms\Api\Response;
use Edms\Api\Auth;

class InfographicsController {
    public function getList(): void {
        $db = Database::getInstance();
        $items = $db->fetchAll("SELECT id, name, thumbnail, created_by, created_at, updated_at FROM infographics ORDER BY updated_at DESC LIMIT 50");
        Response::success($items);
    }

    public function getById(string $id): void {
        $db = Database::getInstance();
        $item = $db->fetchOne("SELECT * FROM infographics WHERE id = :id LIMIT 1", [':id' => $id]);
        if (!$item) {
            Response::notFound('ไม่พบข้อมูลชิ้นงาน Infographics');
        }
        if (isset($item['data']) && is_string($item['data'])) {
            $item['data'] = json_decode($item['data'], true);
        }
        Response::success($item);
    }

    public function save(): void {
        $user = Auth::requireAuth();
        $input = json_decode(file_get_contents('php://input'), true) ?? $_POST;
        $id = $input['id'] ?? ('info_' . time());

        $db = Database::getInstance();
        $data = [
            'id' => $id,
            'name' => $input['name'] ?? 'สื่อประชาสัมพันธ์เตือนภัย ปภ.',
            'thumbnail' => $input['thumbnail'] ?? '',
            'created_by' => $user['username'],
            'updated_at' => date('Y-m-d H:i:s'),
        ];

        if (isset($input['data'])) {
            $data['data'] = is_array($input['data']) ? json_encode($input['data']) : $input['data'];
        }

        $existing = $db->fetchOne("SELECT id FROM infographics WHERE id = :id LIMIT 1", [':id' => $id]);
        if ($existing) {
            $db->update('infographics', $data, 'id = :id', [':id' => $id]);
        } else {
            $data['created_at'] = date('Y-m-d H:i:s');
            $db->insert('infographics', $data);
        }

        Response::success(['id' => $id], 'บันทึกชิ้นงาน Infographics สำเร็จ');
    }

    public function delete(string $id): void {
        $user = Auth::requireAuth();
        $db = Database::getInstance();
        $db->delete('infographics', 'id = :id', [':id' => $id]);
        Response::success([], 'ลบชิ้นงานเรียบร้อยแล้ว');
    }
}
