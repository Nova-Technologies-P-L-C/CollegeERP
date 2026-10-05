<?php

namespace App\Models;

class Attendance extends BaseModel
{
    protected $table = 'Attendance';
    public $timestamps = false;

    protected $casts = [
        'date' => 'datetime',
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
