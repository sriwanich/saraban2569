<?php
namespace Edms\Api;

use PDO;
use PDOException;
use Exception;

class Database {
    private static ?Database $instance = null;
    private ?PDO $pdo = null;
    private string $driver = 'mysql';

    private function __construct() {
        $config = require __DIR__ . '/../config/database.php';
        $this->driver = strtolower($config['driver'] ?? 'mysql');
        
        // Normalize driver name
        if ($this->driver === 'mariadb' || $this->driver === 'mysql') {
            $this->driver = 'mysql';
            $dbConfig = $config['connections']['mysql'];
            $dsn = sprintf(
                'mysql:host=%s;port=%s;dbname=%s;charset=%s',
                $dbConfig['host'],
                $dbConfig['port'],
                $dbConfig['database'],
                $dbConfig['charset']
            );
        } elseif ($this->driver === 'pgsql' || $this->driver === 'postgres' || $this->driver === 'postgresql') {
            $this->driver = 'pgsql';
            $dbConfig = $config['connections']['pgsql'];
            $dsn = sprintf(
                'pgsql:host=%s;port=%s;dbname=%s;sslmode=%s',
                $dbConfig['host'],
                $dbConfig['port'],
                $dbConfig['database'],
                $dbConfig['sslmode'] ?? 'prefer'
            );
        } else {
            throw new Exception("Unsupported database driver: {$this->driver}");
        }

        try {
            $this->pdo = new PDO(
                $dsn,
                $dbConfig['username'],
                $dbConfig['password'],
                $dbConfig['options'] ?? []
            );

            if ($this->driver === 'pgsql') {
                $schema = $dbConfig['schema'] ?? 'public';
                $this->pdo->exec("SET search_path TO {$schema}");
            }
        } catch (PDOException $e) {
            error_log("[Enterprise Database] Connection failed: " . $e->getMessage());
            throw new Exception("Database Connection Error: " . $e->getMessage());
        }
    }

    public static function getInstance(): Database {
        if (self::$instance === null) {
            self::$instance = new Database();
        }
        return self::$instance;
    }

    public function getPdo(): PDO {
        return $this->pdo;
    }

    public function getDriver(): string {
        return $this->driver;
    }

    public function isPostgres(): bool {
        return $this->driver === 'pgsql';
    }

    public function isMariaDb(): bool {
        return $this->driver === 'mysql';
    }

    public function query(string $sql, array $params = []): \PDOStatement {
        $stmt = $this->pdo->prepare($sql);
        $stmt->execute($params);
        return $stmt;
    }

    public function fetchAll(string $sql, array $params = []): array {
        return $this->query($sql, $params)->fetchAll(PDO::FETCH_ASSOC);
    }

    public function fetchOne(string $sql, array $params = []): ?array {
        $result = $this->query($sql, $params)->fetch(PDO::FETCH_ASSOC);
        return $result ?: null;
    }

    public function insert(string $table, array $data): string {
        $fields = array_keys($data);
        $placeholders = array_map(fn($f) => ":{$f}", $fields);
        
        $sql = sprintf(
            'INSERT INTO %s (%s) VALUES (%s)',
            $table,
            implode(', ', $fields),
            implode(', ', $placeholders)
        );

        $params = [];
        foreach ($data as $k => $v) {
            $params[":{$k}"] = $v;
        }

        $this->query($sql, $params);
        return $this->pdo->lastInsertId();
    }

    public function update(string $table, array $data, string $where, array $whereParams = []): int {
        $setClauses = [];
        $params = [];
        foreach ($data as $k => $v) {
            $setClauses[] = "{$k} = :set_{$k}";
            $params[":set_{$k}"] = $v;
        }

        $sql = sprintf('UPDATE %s SET %s WHERE %s', $table, implode(', ', $setClauses), $where);
        foreach ($whereParams as $k => $v) {
            $params[$k] = $v;
        }

        $stmt = $this->query($sql, $params);
        return $stmt->rowCount();
    }

    public function delete(string $table, string $where, array $whereParams = []): int {
        $sql = sprintf('DELETE FROM %s WHERE %s', $table, $where);
        $stmt = $this->query($sql, $whereParams);
        return $stmt->rowCount();
    }

    public function beginTransaction(): bool {
        return $this->pdo->beginTransaction();
    }

    public function commit(): bool {
        return $this->pdo->commit();
    }

    public function rollBack(): bool {
        return $this->pdo->rollBack();
    }
}
