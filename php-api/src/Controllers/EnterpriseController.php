<?php
namespace Edms\Api\Controllers;

use Edms\Api\Database;
use Edms\Api\Response;

class EnterpriseController {
    public function getStatus(): void {
        $startTime = microtime(true);
        $db = Database::getInstance();
        $driver = $db->getDriver();

        $dbConnected = false;
        $dbVersion = 'Unknown';
        try {
            $pdo = $db->getPdo();
            $dbConnected = true;
            $dbVersion = $pdo->getAttribute(\PDO::ATTR_SERVER_VERSION);
        } catch (\Throwable $e) {}

        $latency = round((microtime(true) - $startTime) * 1000, 2);

        Response::success([
            'system' => 'EDMS Saraban Enterprise System',
            'version' => '2.5.0-Enterprise',
            'architecture' => [
                'frontend' => 'Vite 5 + React 18 + TypeScript + Tailwind CSS',
                'backend' => 'PHP 8.2+ REST API (Enterprise Router)',
                'database' => $driver === 'pgsql' ? 'PostgreSQL 14/15/16' : 'MariaDB 10.5+ / MySQL 8.0',
                'dual_db_support' => true,
                'supported_drivers' => ['pgsql', 'mariadb', 'mysql'],
                'auth' => 'HMAC-SHA256 JWT + Argon2id / Bcrypt',
                'standard' => 'ระเบียบสำนักนายกรัฐมนตรีว่าด้วยงานสารบรรณ (ฉบับล่าสุด)',
            ],
            'runtime' => [
                'php_version' => PHP_VERSION,
                'db_driver' => $driver,
                'db_connected' => $dbConnected,
                'db_version' => $dbVersion,
                'db_latency_ms' => $latency,
                'pdo_drivers' => \PDO::getAvailableDrivers(),
                'memory_usage' => round(memory_get_usage(true) / 1024 / 1024, 2) . ' MB',
                'server_time' => date('Y-m-d H:i:s'),
                'timezone' => date_default_timezone_get(),
            ]
        ], 'ระบบสารบรรณ Enterprise พร้อมใช้งาน');
    }

    public function getDiagnostics(): void {
        $db = Database::getInstance();
        $driver = $db->getDriver();
        $isPgsql = $db->isPostgres();

        $tables = [
            'users', 'departments', 'positions', 'folders',
            'inbox_documents', 'outbox_documents', 'internal_documents', 'circular_documents',
            'admin_documents', 'draft_documents', 'reserved_numbers', 'document_tracking',
            'digital_signatures', 'urgent_incidents',
            'vehicles', 'vehicle_inspections', 'vehicle_maintenance',
            'surveys', 'survey_responses', 'workflow_templates', 'workflow_instances',
            'infographics', 'changelogs', 'system_logs', 'settings'
        ];

        $tableStats = [];
        $totalRecords = 0;

        foreach ($tables as $tbl) {
            try {
                $row = $db->fetchOne("SELECT COUNT(*) as cnt FROM {$tbl}");
                $cnt = (int)($row['cnt'] ?? 0);
                $tableStats[$tbl] = [
                    'status' => 'OK',
                    'count' => $cnt
                ];
                $totalRecords += $cnt;
            } catch (\Throwable $e) {
                $tableStats[$tbl] = [
                    'status' => 'TABLE_MISSING_OR_EMPTY',
                    'error' => $e->getMessage()
                ];
            }
        }

        Response::success([
            'database_driver' => $driver,
            'is_postgresql' => $isPgsql,
            'is_mariadb' => !$isPgsql,
            'total_tables_checked' => count($tables),
            'total_records_indexed' => $totalRecords,
            'tables' => $tableStats,
        ], 'ตรวจสอบสถานะฐานข้อมูลเรียบร้อย');
    }
}
