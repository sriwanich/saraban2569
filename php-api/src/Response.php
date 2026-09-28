<?php
namespace Edms\Api;

class Response {
    public static function json(mixed $data, int $statusCode = 200, array $headers = []): void {
        http_response_code($statusCode);
        header('Content-Type: application/json; charset=utf-8');
        foreach ($headers as $k => $v) {
            header("{$k}: {$v}");
        }
        echo json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
        exit;
    }

    public static function success(mixed $data = null, string $message = 'ดำเนินการสำเร็จ', array $meta = []): void {
        self::json([
            'success' => true,
            'message' => $message,
            'data' => $data,
            'meta' => array_merge([
                'timestamp' => date('Y-m-d H:i:s'),
                'server' => 'PHP Enterprise API 2.5',
            ], $meta)
        ], 200);
    }

    public static function error(string $message = 'เกิดข้อผิดพลาดในการประมวลผล', int $statusCode = 400, mixed $details = null): void {
        self::json([
            'success' => false,
            'message' => $message,
            'error' => $details,
            'timestamp' => date('Y-m-d H:i:s')
        ], $statusCode);
    }

    public static function unauthorized(string $message = 'ไม่มีสิทธิ์เข้าถึง หรือเซสชันหมดอายุ กรุณาเข้าสู่ระบบใหม่'): void {
        self::error($message, 401);
    }

    public static function notFound(string $message = 'ไม่พบข้อมูลที่ต้องการ'): void {
        self::error($message, 404);
    }

    public static function forbidden(string $message = 'คุณไม่มีสิทธิ์ในการดำเนินการนี้'): void {
        self::error($message, 403);
    }
}
