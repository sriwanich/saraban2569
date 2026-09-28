<?php
namespace Edms\Api;

class Auth {
    private static function getSecret(): string {
        $app = require __DIR__ . '/../config/app.php';
        return $app['jwt_secret'] ?? 'saraban-enterprise-secure-key-2569';
    }

    public static function createToken(array $payload, int $ttl = 604800): string {
        $header = ['typ' => 'JWT', 'alg' => 'HS256'];
        $now = time();
        $payload['iat'] = $now;
        $payload['exp'] = $now + $ttl;

        $b64Header = self::base64UrlEncode(json_encode($header));
        $b64Payload = self::base64UrlEncode(json_encode($payload));
        $signature = hash_hmac('sha256', "{$b64Header}.{$b64Payload}", self::getSecret(), true);
        $b64Signature = self::base64UrlEncode($signature);

        return "{$b64Header}.{$b64Payload}.{$b64Signature}";
    }

    public static function verifyToken(string $token): ?array {
        $parts = explode('.', $token);
        if (count($parts) !== 3) {
            return null;
        }

        [$b64Header, $b64Payload, $b64Signature] = $parts;
        $signature = self::base64UrlDecode($b64Signature);
        $expected = hash_hmac('sha256', "{$b64Header}.{$b64Payload}", self::getSecret(), true);

        if (!hash_equals($expected, $signature)) {
            return null;
        }

        $payload = json_decode(self::base64UrlDecode($b64Payload), true);
        if (!$payload || !isset($payload['exp']) || $payload['exp'] < time()) {
            return null;
        }

        return $payload;
    }

    public static function getCurrentUser(): ?array {
        $headers = getallheaders();
        $authHeader = $headers['Authorization'] ?? ($headers['authorization'] ?? '');

        if (!$authHeader && isset($_SERVER['HTTP_AUTHORIZATION'])) {
            $authHeader = $_SERVER['HTTP_AUTHORIZATION'];
        }

        if (!$authHeader || !preg_match('/Bearer\s(\S+)/', $authHeader, $matches)) {
            return null;
        }

        $token = $matches[1];
        return self::verifyToken($token);
    }

    public static function requireAuth(): array {
        $user = self::getCurrentUser();
        if (!$user) {
            Response::unauthorized();
        }
        return $user;
    }

    public static function verifyPassword(string $inputPassword, string $storedHash): bool {
        // Support standard PHP password_verify (covers bcrypt, argon2i, argon2id)
        if (password_verify($inputPassword, $storedHash)) {
            return true;
        }

        // Support plain MD5 or SHA256 if migrating legacy systems
        if (md5($inputPassword) === $storedHash || hash('sha256', $inputPassword) === $storedHash) {
            return true;
        }

        return false;
    }

    public static function hashPassword(string $password): string {
        if (defined('PASSWORD_ARGON2ID')) {
            return password_hash($password, PASSWORD_ARGON2ID);
        }
        return password_hash($password, PASSWORD_BCRYPT);
    }

    private static function base64UrlEncode(string $data): string {
        return rtrim(strtr(base64_encode($data), '+/', '-_'), '=');
    }

    private static function base64UrlDecode(string $data): string {
        return base64_decode(strtr($data, '-_', '+/'));
    }
}
