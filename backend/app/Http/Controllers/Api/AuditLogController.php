<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\AuditLog;

class AuditLogController extends Controller
{
    public function index(Request $request)
    {
        $query = AuditLog::query();

        if ($entity = $request->query('entity')) {
            if ($entity !== 'all' && $entity !== 'ALL') {
                $query->where('entity', $entity);
            }
        }

        if ($entityId = $request->query('entityId')) {
            $query->where('entityId', $entityId);
        }

        if ($action = $request->query('action')) {
            if ($action !== 'all' && $action !== 'ALL') {
                $query->where('action', $action);
            }
        }

        $programLevel = $request->query('programLevel', 'BS');
        if ($programLevel !== 'ALL') {
            if ($programLevel === 'INTERMEDIATE') {
                $query->where('programLevel', 'INTERMEDIATE');
            } else {
                $query->where(function ($q) {
                    $q->where('programLevel', 'BS')
                      ->orWhereNull('programLevel');
                });
            }
        }

        $logs = $query->orderBy('createdAt', 'desc')->limit(200)->get();

        return response()->json($logs);
    }

    public function cleanup(Request $request)
    {
        // Delete logs older than 90 days or expired
        $deleted = AuditLog::whereNotNull('expiresAt')
            ->where('expiresAt', '<', now())
            ->delete();

        return response()->json(['message' => 'Cleaned expired audit logs', 'deletedCount' => $deleted]);
    }
}
