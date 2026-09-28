<?php
/**
 * Enterprise Application Configuration
 */

return [
    'app_name' => 'EDMS Saraban Enterprise',
    'app_version' => '2.5.0-Enterprise',
    'env' => getenv('APP_ENV') ?: 'production',
    'debug' => getenv('APP_DEBUG') === 'true' || getenv('APP_ENV') === 'development',
    'jwt_secret' => getenv('JWT_SECRET') ?: 'saraban-enterprise-secure-key-2569-ddpm-secret-token',
    'jwt_expiry' => 86400 * 7, // 7 days
    'upload_dir' => __DIR__ . '/../../uploads',
    'cors_allowed_origins' => explode(',', getenv('CORS_ORIGIN') ?: '*'),
];
