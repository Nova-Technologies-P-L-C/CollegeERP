<?php

namespace App\Models;

class Announcement extends BaseModel
{
    protected $table = 'Announcement';
    public $timestamps = false;

    protected $casts = [
        'date' => 'datetime',
        'targetSemester' => 'integer',
    ];
}
