<?php

namespace App\Models;

class Enrollment extends BaseModel
{
    protected $table = 'Enrollment';
    public $timestamps = false;

    protected $casts = [
        'semester' => 'integer',
        'blocked' => 'boolean',
        'readmitRequested' => 'boolean',
    ];

    public function course()
    {
        return $this->belongsTo(Course::class, 'courseId', 'id');
    }

    public function student()
    {
        return $this->belongsTo(Student::class, 'studentId', 'id');
    }
}
