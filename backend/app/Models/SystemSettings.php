<?php

namespace App\Models;

class SystemSettings extends BaseModel
{
    protected $table = 'SystemSettings';

    const CREATED_AT = 'createdAt';
    const UPDATED_AT = 'updatedAt';

    protected $casts = [
        'createdAt' => 'datetime',
        'updatedAt' => 'datetime',
    ];
}
