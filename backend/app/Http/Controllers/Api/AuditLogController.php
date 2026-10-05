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
            $query->where('entity', $entity);
        }

        if ($entityId = $request->query('entityId')) {
            $query->where('entityId', $entityId);
        }

        $programLevel = $request->query('programLevel', 'BS');
        if ($programLevel !== 'ALL') {
            $query->where('programLevel', $programLevel === 'INTERMEDIATE' ? 'INTERMEDIATE' : 'BS');
        }

        $logs = $query->orderBy('createdAt', 'desc')->limit(100)->get();

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
