<?php

namespace App\Models;

class Admission extends BaseModel
{
    protected $table = 'Admission';
    public $timestamps = false;

    protected $casts = [
        'applicationDate' => 'datetime',
        'marksObtained' => 'float',
        'totalMarks' => 'float',
        'semester' => 'integer',
        'part' => 'integer',
        'selectedCourses' => 'array',
        'blocked' => 'boolean',
    ];
}
