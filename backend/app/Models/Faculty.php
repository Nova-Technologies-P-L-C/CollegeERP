<?php

namespace App\Models;

class Faculty extends BaseModel
{
    protected $table = 'Faculty';

    public $timestamps = false;

    protected $casts = [
        'joinDate' => 'datetime',
    ];

    public function user()
    {
        return $this->belongsTo(User::class, 'userId', 'id');
    }

    public function teaches()
    {
        return $this->hasMany(Course::class, 'assignedFaculty', 'id');
    }

    public function teachesMorning()
    {
        return $this->hasMany(Course::class, 'assignedFacultyMorning', 'id');
    }

    public function teachesEvening()
    {
        return $this->hasMany(Course::class, 'assignedFacultyEvening', 'id');
    }

    public function attendances()
    {
        return $this->hasMany(FacultyAttendance::class, 'facultyId', 'id');
    }
}
