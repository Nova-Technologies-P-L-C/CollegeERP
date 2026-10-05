<?php

namespace App\Models;

class FacultyAttendance extends BaseModel
{
    protected $table = 'FacultyAttendance';
    public $timestamps = false;

    protected $casts = [
        'date' => 'datetime',
        'checkInTime' => 'datetime',
        'checkOutTime' => 'datetime',
    ];

    public function faculty()
    {
        return $this->belongsTo(Faculty::class, 'facultyId', 'id');
    }
}
