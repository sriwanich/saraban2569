<?php
/**
 * Enterprise Database Configuration
 * Supports both PostgreSQL (pgsql) and MariaDB / MySQL (mysql)
 */

return [
    // Driver: 'pgsql' (PostgreSQL) or 'mysql' (MariaDB / MySQL)
    'driver' => getenv('DB_DRIVER') ?: (getenv('DB_CONNECTION') ?: 'mysql'),
    
    'connections' => [
        'pgsql' => [
            'host' => getenv('DB_HOST') ?: '127.0.0.1',
            'port' => getenv('DB_PORT') ?: '5432',
            'database' => getenv('DB_DATABASE') ?: (getenv('DB_NAME') ?: 'saraban_enterprise'),
            'username' => getenv('DB_USERNAME') ?: (getenv('DB_USER') ?: 'postgres'),
            'password' => getenv('DB_PASSWORD') ?: (getenv('DB_PASS') ?: ''),
            'charset' => 'utf8',
            'schema' => getenv('DB_SCHEMA') ?: 'public',
            'sslmode' => getenv('DB_SSLMODE') ?: 'prefer',
            'options' => [
                PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
                PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                PDO::ATTR_EMULATE_PREPARES => false,
            ],
        ],
        'mysql' => [
            'host' => getenv('DB_HOST') ?: '127.0.0.1',
            'port' => getenv('DB_PORT') ?: '3306',
            'database' => getenv('DB_DATABASE') ?: (getenv('DB_NAME') ?: 'saraban_enterprise'),
            'username' => getenv('DB_USERNAME') ?: (getenv('DB_USER') ?: 'root'),
            'password' => getenv('DB_PASSWORD') ?: (getenv('DB_PASS') ?: ''),
            'charset' => 'utf8mb4',
            'collation' => 'utf8mb4_unicode_ci',
            'options' => [
                PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
                PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                PDO::ATTR_EMULATE_PREPARES => false,
                PDO::MYSQL_ATTR_INIT_COMMAND => "SET NAMES utf8mb4 COLLATE utf8mb4_unicode_ci",
            ],
        ],
    ],
];
