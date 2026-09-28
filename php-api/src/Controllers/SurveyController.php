<?php
namespace Edms\Api\Controllers;

use Edms\Api\Database;
use Edms\Api\Response;
use Edms\Api\Auth;

class SurveyController {
    public function getSurveys(): void {
        $db = Database::getInstance();
        $surveys = $db->fetchAll("SELECT * FROM surveys ORDER BY id DESC");
        foreach ($surveys as &$s) {
            $s['elements'] = json_decode($s['elements_json'] ?? '[]', true);
            $s['theme'] = json_decode($s['theme_json'] ?? '{}', true);
            $s['settings'] = json_decode($s['settings_json'] ?? '{}', true);
        }
        Response::success($surveys);
    }

    public function getResponses(string|int $surveyId): void {
        $db = Database::getInstance();
        $responses = $db->fetchAll("SELECT * FROM survey_responses WHERE survey_id = :sid ORDER BY id DESC", [':sid' => $surveyId]);
        foreach ($responses as &$r) {
            $r['answers'] = json_decode($r['answers_json'] ?? '{}', true);
        }
        Response::success($responses);
    }

    public function saveResponse(): void {
        $input = json_decode(file_get_contents('php://input'), true) ?? $_POST;
        $surveyId = $input['survey_id'] ?? null;
        if (!$surveyId) {
            Response::error('ระบุรหัสแบบสำรวจไม่ถูกต้อง', 422);
        }

        $db = Database::getInstance();
        $id = $db->insert('survey_responses', [
            'survey_id' => $surveyId,
            'respondent_name' => $input['respondent_name'] ?? 'ผู้ตอบแบบสำรวจทั่วไป',
            'answers_json' => is_array($input['answers'] ?? null) ? json_encode($input['answers'], JSON_UNESCAPED_UNICODE) : ($input['answers_json'] ?? '{}'),
            'score' => (int)($input['score'] ?? 0),
            'submitted_at' => date('Y-m-d H:i:s'),
            'ip_address' => $_SERVER['REMOTE_ADDR'] ?? '127.0.0.1',
        ]);

        Response::success(['id' => $id], 'ส่งแบบประเมิน/สำรวจสำเร็จ');
    }
}
