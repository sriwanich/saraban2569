<?php
namespace Edms\Api\Controllers;

use Edms\Api\Database;
use Edms\Api\Response;
use Edms\Api\Auth;

class VehicleController {
    public function getVehicles(): void {
        $db = Database::getInstance();
        $vehicles = $db->fetchAll("SELECT * FROM vehicles ORDER BY id ASC");
        Response::success($vehicles);
    }

    public function getVehicleById(string $id): void {
        $db = Database::getInstance();
        $vehicle = $db->fetchOne("SELECT * FROM vehicles WHERE id = :id LIMIT 1", [':id' => $id]);
        if (!$vehicle) {
            Response::notFound('ไม่พบข้อมูลยานพาหนะ');
        }
        $inspections = $db->fetchAll("SELECT * FROM vehicle_inspections WHERE vehicle_id = :id ORDER BY id DESC LIMIT 20", [':id' => $id]);
        $maintenance = $db->fetchAll("SELECT * FROM vehicle_maintenance WHERE vehicle_id = :id ORDER BY id DESC LIMIT 20", [':id' => $id]);

        $vehicle['inspections'] = $inspections;
        $vehicle['maintenance'] = $maintenance;
        Response::success($vehicle);
    }

    public function getInspections(string $vehicleId): void {
        $db = Database::getInstance();
        $items = $db->fetchAll("SELECT * FROM vehicle_inspections WHERE vehicle_id = :id ORDER BY id DESC", [':id' => $vehicleId]);
        Response::success($items);
    }

    public function createInspection(): void {
        $user = Auth::requireAuth();
        $input = json_decode(file_get_contents('php://input'), true) ?? $_POST;

        $vehicleId = $input['vehicle_id'] ?? '';
        if (!$vehicleId) {
            Response::error('ระบุรหัสยานพาหนะไม่ถูกต้อง', 422);
        }

        $db = Database::getInstance();
        $id = 'INSP-' . time() . '-' . rand(100, 999);

        $data = [
            'id' => $id,
            'vehicle_id' => $vehicleId,
            'inspection_date' => $input['inspection_date'] ?? date('Y-m-d H:i:s'),
            'mileage' => (int)($input['mileage'] ?? 0),
            'fuel_level' => $input['fuel_level'] ?? 'เต็มถัง',
            'overall_status' => $input['overall_status'] ?? 'พร้อมใช้งาน',
            'inspector_name' => $input['inspector_name'] ?? ($user['firstName'] . ' ' . $user['lastName']),
            'inspector_user_id' => $user['id'],
            'notes' => $input['notes'] ?? '',
            'photos_json' => is_array($input['photos'] ?? null) ? json_encode($input['photos'], JSON_UNESCAPED_UNICODE) : ($input['photos_json'] ?? '[]'),
            'items_checked_json' => is_array($input['items_checked'] ?? null) ? json_encode($input['items_checked'], JSON_UNESCAPED_UNICODE) : ($input['items_checked_json'] ?? '[]'),
            'created_at' => date('Y-m-d H:i:s'),
        ];

        $db->insert('vehicle_inspections', $data);

        // Update current mileage in vehicles table
        if ($data['mileage'] > 0) {
            $db->update('vehicles', ['current_mileage' => $data['mileage']], 'id = :vid', [':vid' => $vehicleId]);
        }

        Response::success(['id' => $id], 'บันทึกรายงานการตรวจสภาพยานพาหนะสำเร็จ');
    }
}
