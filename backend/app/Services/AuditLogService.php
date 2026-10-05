<?php

namespace App\Services;

use App\Models\AuditLog;
use App\Models\User;

class AuditLogService
{
    public static function log(
        string $action,
        string $entity,
        string $entityId,
        string $description,
        ?string $adminClerkId = null,
        ?string $adminName = null,
        string $programLevel = 'BS'
    ): AuditLog {
        if (!$adminName && $adminClerkId) {
            $user = User::where('clerkId', $adminClerkId)->first();
            $adminName = $user ? $user->name : 'Admin';
        }

        return AuditLog::create([
            'action' => $action,
            'entity' => $entity,
            'entityId' => $entityId,
            'description' => $description,
            'adminId' => $adminClerkId,
            'adminName' => $adminName ?? 'System',
            'programLevel' => $programLevel === 'INTERMEDIATE' ? 'INTERMEDIATE' : 'BS',
        ]);
    }
}
