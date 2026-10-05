<?php

namespace App\Models;

class TimetableSettings extends BaseModel
{
    protected $table = 'TimetableSettings';

    const CREATED_AT = 'createdAt';
    const UPDATED_AT = 'updatedAt';

    protected $casts = [
        'duration' => 'integer',
        'slots' => 'integer',
        'createdAt' => 'datetime',
        'updatedAt' => 'datetime',
    ];
}
