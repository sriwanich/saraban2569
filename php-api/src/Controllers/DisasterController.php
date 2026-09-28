<?php
namespace Edms\Api\Controllers;

use Edms\Api\Database;
use Edms\Api\Response;
use Edms\Api\Auth;

class DisasterController {
    /**
     * ดึงรายการรายงานเหตุด่วนสาธารณภัย ปภ. 24 ชม.
     */
    public function getIncidents(): void {
        $search = $_GET['search'] ?? '';
        $severity = $_GET['severity'] ?? '';
        $page = max(1, (int)($_GET['page'] ?? 1));
        $limit = min(100, max(1, (int)($_GET['limit'] ?? 20)));
        $offset = ($page - 1) * $limit;

        $db = Database::getInstance();
        $isPgsql = $db->isPostgres();

        $where = ['is_deleted = 0' . ($isPgsql ? '::boolean' : '')];
        $params = [];

        if ($search) {
            $likeOp = $isPgsql ? 'ILIKE' : 'LIKE';
            $where[] = "(doc_number {$likeOp} :s1 OR location {$likeOp} :s2 OR incident_types {$likeOp} :s3 OR reporter_name {$likeOp} :s4)";
            $params[':s1'] = "%{$search}%";
            $params[':s2'] = "%{$search}%";
            $params[':s3'] = "%{$search}%";
            $params[':s4'] = "%{$search}%";
        }

        if ($severity) {
            $where[] = "severity = :sev";
            $params[':sev'] = $severity;
        }

        $whereSql = implode(' AND ', $where);
        $countRow = $db->fetchOne("SELECT COUNT(*) as total FROM urgent_incidents WHERE {$whereSql}", $params);
        $total = (int)($countRow['total'] ?? 0);

        $sql = "SELECT * FROM urgent_incidents WHERE {$whereSql} ORDER BY created_at DESC LIMIT {$limit} OFFSET {$offset}";
        $items = $db->fetchAll($sql, $params);

        // Decode JSON fields for frontend
        foreach ($items as &$item) {
            if (isset($item['damage_images']) && is_string($item['damage_images'])) {
                $item['damage_images'] = json_decode($item['damage_images'], true) ?? [];
            }
        }

        Response::success($items, 'ดึงรายการรายงานเหตุด่วนสาธารณภัยสำเร็จ', [
            'total' => $total,
            'page' => $page,
            'limit' => $limit,
            'total_pages' => ceil($total / $limit)
        ]);
    }

    /**
     * ดึงรายละเอียดรายงานเหตุการณ์ตาม ID
     */
    public function getIncidentById(string $id): void {
        $db = Database::getInstance();
        $item = $db->fetchOne("SELECT * FROM urgent_incidents WHERE id = :id LIMIT 1", [':id' => $id]);

        if (!$item) {
            Response::notFound('ไม่พบข้อมูลรายงานเหตุด่วนสาธารณภัย');
        }

        if (isset($item['damage_images']) && is_string($item['damage_images'])) {
            $item['damage_images'] = json_decode($item['damage_images'], true) ?? [];
        }

        Response::success($item);
    }

    /**
     * บันทึกรายงานเหตุด่วนสาธารณภัยฉบับใหม่
     */
    public function createIncident(): void {
        $user = Auth::requireAuth();
        $input = json_decode(file_get_contents('php://input'), true) ?? $_POST;

        $db = Database::getInstance();
        $id = $input['id'] ?? 'inc_' . time() . '_' . substr(bin2hex(random_bytes(4)), 0, 6);

        $data = [
            'id' => $id,
            'doc_number' => $input['doc_number'] ?? $input['docNumber'] ?? ('ปภ.รย-ด่วน ' . date('d/m/') . (date('Y') + 543)),
            'doc_date' => $input['doc_date'] ?? $input['docDate'] ?? date('Y-m-d'),
            'from_person' => $input['from_person'] ?? $input['fromPerson'] ?? ($user['firstName'] . ' ' . $user['lastName']),
            'to_person' => $input['to_person'] ?? $input['toPerson'] ?? 'ผู้ว่าราชการจังหวัดระยอง / อธิบดีกรม ปภ.',
            'incident_types' => is_array($input['incident_types'] ?? null) ? json_encode($input['incident_types']) : ($input['incident_types'] ?? ''),
            'incident_type_other' => $input['incident_type_other'] ?? $input['incidentTypeOther'] ?? '',
            'severity' => $input['severity'] ?? 'ปานกลาง',
            'start_date' => $input['start_date'] ?? $input['startDate'] ?? date('Y-m-d'),
            'start_time' => $input['start_time'] ?? $input['startTime'] ?? date('H:i'),
            'end_date' => $input['end_date'] ?? $input['endDate'] ?? '',
            'end_time' => $input['end_time'] ?? $input['endTime'] ?? '',
            'location' => $input['location'] ?? '',
            'affected_people' => (string)($input['affected_people'] ?? $input['affectedPeople'] ?? '0'),
            'affected_households' => (string)($input['affected_households'] ?? $input['affectedHouseholds'] ?? '0'),
            'injured' => (string)($input['injured'] ?? '0'),
            'dead' => (string)($input['dead'] ?? '0'),
            'missing' => (string)($input['missing'] ?? '0'),
            'evacuated_people' => (string)($input['evacuated_people'] ?? $input['evacuatedPeople'] ?? '0'),
            'evacuated_households' => (string)($input['evacuated_households'] ?? $input['evacuatedHouseholds'] ?? '0'),
            'damage_houses' => (string)($input['damage_houses'] ?? $input['damageHouses'] ?? '0'),
            'damage_high_rises' => (string)($input['damage_high_rises'] ?? $input['damageHighRises'] ?? '0'),
            'damage_temples' => (string)($input['damage_temples'] ?? $input['damageTemples'] ?? '0'),
            'damage_gov_buildings' => (string)($input['damage_gov_buildings'] ?? $input['damageGovBuildings'] ?? '0'),
            'damage_other_buildings' => (string)($input['damage_other_buildings'] ?? $input['damageOtherBuildings'] ?? '0'),
            'damage_building_cost' => (string)($input['damage_building_cost'] ?? $input['damageBuildingCost'] ?? '0'),
            'total_damage_cost' => (string)($input['total_damage_cost'] ?? $input['totalDamageCost'] ?? '0'),
            'mitigation' => $input['mitigation'] ?? '',
            'proposals' => $input['proposals'] ?? '',
            'reporter_name' => $input['reporter_name'] ?? $input['reporterName'] ?? ($user['firstName'] . ' ' . $user['lastName']),
            'reporter_position' => $input['reporter_position'] ?? $input['reporterPosition'] ?? $user['position'],
            'signature_image' => $input['signature_image'] ?? $input['signatureImage'] ?? '',
            'damage_images' => is_array($input['damage_images'] ?? null) ? json_encode($input['damage_images']) : ($input['damage_images'] ?? '[]'),
        ];

        $db->insert('urgent_incidents', $data);

        // Audit Log
        try {
            $db->insert('system_logs', [
                'username' => $user['username'],
                'action' => 'CREATE_DISASTER_INCIDENT',
                'details' => "สร้างรายงานเหตุด่วนสาธารณภัย {$data['doc_number']} สถานที่: {$data['location']}",
                'module' => 'URGENT_INCIDENT',
                'ip_address' => $_SERVER['REMOTE_ADDR'] ?? '127.0.0.1'
            ]);
        } catch (\Throwable $e) {}

        Response::success(['id' => $id, 'doc_number' => $data['doc_number']], 'บันทึกรายงานเหตุด่วนสำเร็จ');
    }

    /**
     * ดึงสถิติภาพรวมรายงานเหตุด่วนสาธารณภัยสำหรับ Dashboard
     */
    public function getStats(): void {
        $db = Database::getInstance();
        $totalIncidents = $db->fetchOne("SELECT COUNT(*) as count FROM urgent_incidents WHERE is_deleted = 0");
        $highSeverity = $db->fetchOne("SELECT COUNT(*) as count FROM urgent_incidents WHERE is_deleted = 0 AND severity IN ('สูง', 'วิกฤต', 'รุนแรงมาก')");

        Response::success([
            'total' => (int)($totalIncidents['count'] ?? 0),
            'critical_count' => (int)($highSeverity['count'] ?? 0),
            'system_status' => '24_HOURS_READY',
            'updated_at' => date('Y-m-d H:i:s')
        ]);
    }
}
