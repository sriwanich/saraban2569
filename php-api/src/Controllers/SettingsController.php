<?php
namespace Edms\Api\Controllers;

use Edms\Api\Database;
use Edms\Api\Response;
use Edms\Api\Auth;

class SettingsController {
    /**
     * ดึงการตั้งค่าองค์กร
     */
    public function getSettings(): void {
        $db = Database::getInstance();
        $settings = $db->fetchOne("SELECT * FROM settings WHERE id = 1 LIMIT 1");

        if (!$settings) {
            $settings = [
                'currentYear' => 2569,
                'startSequence' => 1,
                'orgName' => 'สำนักงานป้องกันและบรรเทาสาธารณภัย',
                'headerOrgName' => 'สำนักงานป้องกันและบรรเทาสาธารณภัยจังหวัดระยอง',
                'orgCode' => 'รย 0021',
                'footerText' => 'ระบบสารบรรณอิเล็กทรอนิกส์ (EDMS Enterprise)'
            ];
        }

        if (isset($settings['enabledFeatures']) && is_string($settings['enabledFeatures'])) {
            $settings['enabledFeatures'] = json_decode($settings['enabledFeatures'], true);
        }

        // Hide sensitive credentials
        unset($settings['geminiApiKey'], $settings['smtpPassword']);

        Response::success($settings);
    }

    /**
     * อัปเดตการตั้งค่าองค์กร (Admin / Superadmin only)
     */
    public function updateSettings(): void {
        $user = Auth::requireAuth();
        if (($user['role'] ?? '') !== 'admin' && ($user['role'] ?? '') !== 'superadmin') {
            Response::forbidden('คุณไม่มีสิทธิ์ในการแก้ไขการตั้งค่าระบบองค์กร');
        }

        $input = json_decode(file_get_contents('php://input'), true) ?? $_POST;
        $db = Database::getInstance();

        $updateData = [];
        $fields = ['currentYear', 'startSequence', 'orgName', 'headerOrgName', 'orgCode', 'logoUrl', 'garuda15Url', 'garuda30Url', 'faviconUrl', 'footerText', 'smtpHost', 'smtpPort', 'smtpUser', 'smtpFrom'];

        foreach ($fields as $f) {
            if (isset($input[$f])) {
                $updateData[$f] = $input[$f];
            }
        }

        if (isset($input['enabledFeatures'])) {
            $updateData['enabledFeatures'] = is_array($input['enabledFeatures']) ? json_encode($input['enabledFeatures']) : $input['enabledFeatures'];
        }

        if (isset($input['geminiApiKey']) && trim($input['geminiApiKey']) !== '') {
            $updateData['geminiApiKey'] = $input['geminiApiKey'];
        }

        if (isset($input['smtpPassword']) && trim($input['smtpPassword']) !== '') {
            $updateData['smtpPassword'] = $input['smtpPassword'];
        }

        if (!empty($updateData)) {
            $db->update('settings', $updateData, 'id = :id', [':id' => 1]);
        }

        // Audit Log
        try {
            $db->insert('system_logs', [
                'username' => $user['username'],
                'action' => 'UPDATE_SETTINGS',
                'details' => "แก้ไขการตั้งค่าองค์กรและสิทธิ์การใช้งาน",
                'module' => 'SETTINGS',
                'ip_address' => $_SERVER['REMOTE_ADDR'] ?? '127.0.0.1'
            ]);
        } catch (\Throwable $e) {}

        Response::success([], 'บันทึกการตั้งค่าระบบสำเร็จ');
    }

    /**
     * ดึงรายชื่อหน่วยงานและตำแหน่ง
     */
    public function getMeta(): void {
        $db = Database::getInstance();
        $departments = $db->fetchAll("SELECT * FROM departments ORDER BY id ASC");
        $positions = $db->fetchAll("SELECT * FROM positions ORDER BY id ASC");

        Response::success([
            'departments' => $departments,
            'positions' => $positions
        ]);
    }
}
