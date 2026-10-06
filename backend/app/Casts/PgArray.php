<?php

namespace App\Casts;

use Illuminate\Contracts\Database\Eloquent\CastsAttributes;
use Illuminate\Database\Eloquent\Model;

class PgArray implements CastsAttributes
{
    /**
     * Cast the given value from PostgreSQL array format to a PHP array.
     */
    public function get(Model $model, string $key, mixed $value, array $attributes): mixed
    {
        if ($value === null || $value === '') {
            return [];
        }

        if (is_array($value)) {
            return $value;
        }

        $trimmed = trim((string) $value, '{}');
        if ($trimmed === '') {
            return [];
        }

        return str_getcsv($trimmed);
    }

    /**
     * Prepare the given value for storage in a PostgreSQL text[] array column.
     */
    public function set(Model $model, string $key, mixed $value, array $attributes): mixed
    {
        if ($value === null) {
            return '{}';
        }

        if (is_string($value)) {
            if (str_starts_with($value, '{') && str_ends_with($value, '}')) {
                return $value;
            }
            // If empty string or empty json
            if ($value === '' || $value === '[]') {
                return '{}';
            }
            // If json string, decode it first
            $decoded = json_decode($value, true);
            if (is_array($decoded)) {
                $value = $decoded;
            }
        }

        if (is_array($value)) {
            if (empty($value)) {
                return '{}';
            }

            $escaped = array_map(function ($item) {
                return '"' . str_replace(['\\', '"'], ['\\\\', '\\"'], (string) $item) . '"';
            }, $value);

            return '{' . implode(',', $escaped) . '}';
        }

        return '{}';
    }
}
