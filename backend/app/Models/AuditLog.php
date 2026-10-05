<?php

namespace App\Models;

class AuditLog extends BaseModel
{
    protected $table = 'AuditLog';

    const CREATED_AT = 'createdAt';
    const UPDATED_AT = null;

    protected $casts = [
        'createdAt' => 'datetime',
        'expiresAt' => 'datetime',
    ];

    public function adminUser()
    {
        return $this->belongsTo(User::class, 'adminId', 'clerkId');
    }
}
