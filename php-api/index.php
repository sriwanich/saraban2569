<?php
/**
 * EDMS Saraban Enterprise REST API
 * Architecture: Vite + React ↔ PHP 8.2 API ↔ PostgreSQL / MariaDB
 */

declare(strict_types=1);

// Automatic Error Handling & Reporting
error_reporting(E_ALL & ~E_NOTICE);
ini_set('display_errors', '0');

// Load configurations and classes
require_once __DIR__ . '/config/app.php';
require_once __DIR__ . '/src/Database.php';
require_once __DIR__ . '/src/Response.php';
require_once __DIR__ . '/src/Auth.php';
require_once __DIR__ . '/src/Controllers/AuthController.php';
require_once __DIR__ . '/src/Controllers/DocumentController.php';
require_once __DIR__ . '/src/Controllers/WorkflowController.php';
require_once __DIR__ . '/src/Controllers/VehicleController.php';
require_once __DIR__ . '/src/Controllers/SurveyController.php';
require_once __DIR__ . '/src/Controllers/LogController.php';
require_once __DIR__ . '/src/Controllers/EnterpriseController.php';
require_once __DIR__ . '/src/Controllers/DisasterController.php';
require_once __DIR__ . '/src/Controllers/SettingsController.php';
require_once __DIR__ . '/src/Controllers/InfographicsController.php';

use Edms\Api\Response;
use Edms\Api\Controllers\AuthController;
use Edms\Api\Controllers\DocumentController;
use Edms\Api\Controllers\WorkflowController;
use Edms\Api\Controllers\VehicleController;
use Edms\Api\Controllers\SurveyController;
use Edms\Api\Controllers\LogController;
use Edms\Api\Controllers\EnterpriseController;
use Edms\Api\Controllers\DisasterController;
use Edms\Api\Controllers\SettingsController;
use Edms\Api\Controllers\InfographicsController;

// Enterprise CORS Preflight
$origin = $_SERVER['HTTP_ORIGIN'] ?? '*';
header("Access-Control-Allow-Origin: {$origin}");
header("Access-Control-Allow-Credentials: true");
header("Access-Control-Allow-Methods: GET, POST, PUT, PATCH, DELETE, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With, Accept, Origin");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// Request path parsing
$requestUri = $_SERVER['REQUEST_URI'] ?? '/';
$path = parse_url($requestUri, PHP_URL_PATH);

// Strip prefix if hosted under /php-api or /api
$path = preg_replace('#^/(php-api|api)#', '', $path);
$path = rtrim($path, '/');
if ($path === '') $path = '/';

$method = $_SERVER['REQUEST_METHOD'];

try {
    // Enterprise System & Diagnostics
    if ($path === '/enterprise/status' && $method === 'GET') {
        (new EnterpriseController())->getStatus();
    }
    if ($path === '/enterprise/diagnostics' && $method === 'GET') {
        (new EnterpriseController())->getDiagnostics();
    }

    // Settings & Meta
    if ($path === '/settings' && $method === 'GET') {
        (new SettingsController())->getSettings();
    }
    if ($path === '/settings' && ($method === 'POST' || $method === 'PUT')) {
        (new SettingsController())->updateSettings();
    }
    if ($path === '/meta' && $method === 'GET') {
        (new SettingsController())->getMeta();
    }

    // Auth Routes
    if ($path === '/login' && $method === 'POST') {
        (new AuthController())->login();
    }
    if ($path === '/me' && $method === 'GET') {
        (new AuthController())->me();
    }
    if ($path === '/logout' && $method === 'POST') {
        (new AuthController())->logout();
    }
    if ($path === '/users' && $method === 'GET') {
        (new AuthController())->getUsers();
    }

    // Document Routes
    if ($path === '/documents' && $method === 'GET') {
        (new DocumentController())->getDocuments();
    }
    if (preg_match('#^/documents/([^/]+)$#', $path, $matches) && $method === 'GET') {
        (new DocumentController())->getDocumentById($matches[1]);
    }
    if ($path === '/documents' && $method === 'POST') {
        (new DocumentController())->createDocument();
    }
    if (preg_match('#^/documents/([^/]+)$#', $path, $matches) && ($method === 'PUT' || $method === 'PATCH')) {
        (new DocumentController())->updateDocument($matches[1]);
    }
    if (preg_match('#^/documents/([^/]+)$#', $path, $matches) && $method === 'DELETE') {
        (new DocumentController())->deleteDocument($matches[1]);
    }
    if ($path === '/reserved-numbers' && $method === 'GET') {
        (new DocumentController())->getReservedNumbers();
    }

    // Urgent Incident & Disaster 24h Reports
    if ($path === '/urgent-incidents' && $method === 'GET') {
        (new DisasterController())->getIncidents();
    }
    if (preg_match('#^/urgent-incidents/([^/]+)$#', $path, $matches) && $method === 'GET') {
        (new DisasterController())->getIncidentById($matches[1]);
    }
    if ($path === '/urgent-incidents' && $method === 'POST') {
        (new DisasterController())->createIncident();
    }
    if ($path === '/urgent-incidents/stats' && $method === 'GET') {
        (new DisasterController())->getStats();
    }

    // Infographics Designer
    if ($path === '/infographics' && $method === 'GET') {
        (new InfographicsController())->getList();
    }
    if (preg_match('#^/infographics/([^/]+)$#', $path, $matches) && $method === 'GET') {
        (new InfographicsController())->getById($matches[1]);
    }
    if ($path === '/infographics' && $method === 'POST') {
        (new InfographicsController())->save();
    }
    if (preg_match('#^/infographics/([^/]+)$#', $path, $matches) && $method === 'DELETE') {
        (new InfographicsController())->delete($matches[1]);
    }

    // Workflow & Routing Slips
    if ($path === '/workflow/instances' && $method === 'GET') {
        (new WorkflowController())->getWorkflowInstances();
    }
    if ($path === '/workflow/step' && $method === 'POST') {
        (new WorkflowController())->addStep();
    }

    // Vehicle Routes
    if ($path === '/vehicles' && $method === 'GET') {
        (new VehicleController())->getVehicles();
    }
    if (preg_match('#^/vehicles/([^/]+)$#', $path, $matches) && $method === 'GET') {
        (new VehicleController())->getVehicleById($matches[1]);
    }
    if (preg_match('#^/vehicles/([^/]+)/inspections$#', $path, $matches) && $method === 'GET') {
        (new VehicleController())->getInspections($matches[1]);
    }
    if ($path === '/vehicle-inspections' && $method === 'POST') {
        (new VehicleController())->createInspection();
    }

    // Survey Routes
    if ($path === '/surveys' && $method === 'GET') {
        (new SurveyController())->getSurveys();
    }
    if (preg_match('#^/surveys/(\d+)/responses$#', $path, $matches) && $method === 'GET') {
        (new SurveyController())->getResponses($matches[1]);
    }
    if (preg_match('#^/surveys/(\d+)/responses$#', $path, $matches) && $method === 'POST') {
        (new SurveyController())->saveResponse();
    }

    // Audit Logs
    if ($path === '/logs' && $method === 'GET') {
        (new LogController())->getLogs();
    }
    if ($path === '/logs' && $method === 'POST') {
        (new LogController())->createLog();
    }

    // Fallback 404 for unknown API route
    Response::notFound("Enterprise API endpoint not found: [{$method}] {$path}");
} catch (\Throwable $e) {
    error_log("[Enterprise API Error] " . $e->getMessage() . " in " . $e->getFile() . ":" . $e->getLine());
    Response::error($e->getMessage(), 500, [
        'file' => basename($e->getFile()),
        'line' => $e->getLine(),
    ]);
}
