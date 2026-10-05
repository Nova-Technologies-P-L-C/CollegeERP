<?php

namespace App\Models;

class OnboardingRequest extends BaseModel
{
    protected $table = 'OnboardingRequest';

    const CREATED_AT = 'createdAt';
    const UPDATED_AT = 'updatedAt';

    protected $casts = [
        'part' => 'integer',
        'createdAt' => 'datetime',
        'updatedAt' => 'datetime',
    ];
}
