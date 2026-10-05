<?php

namespace App\Models;

class Course extends BaseModel
{
    protected $table = 'Course';
    public $timestamps = false;

    protected $casts = [
        'creditHours' => 'integer',
        'totalMarks' => 'integer',
        'semester' => 'integer',
        'part' => 'integer',
    ];

    public function faculty()
    {
        return $this->belongsTo(Faculty::class, 'assignedFaculty', 'id');
    }

    public function facultyMorning()
    {
        return $this->belongsTo(Faculty::class, 'assignedFacultyMorning', 'id');
    }

    public function facultyEvening()
    {
        return $this->belongsTo(Faculty::class, 'assignedFacultyEvening', 'id');
    }

    public function enrollments()
    {
        return $this->hasMany(Enrollment::class, 'courseId', 'id');
    }

    public function attendances()
    {
        return $this->hasMany(Attendance::class, 'courseId', 'id');
    }

    public function grades()
    {
        return $this->hasMany(Grade::class, 'courseId', 'id');
    }

    public function quizzes()
    {
        return $this->hasMany(Quiz::class, 'courseId', 'id');
    }

    public function timetables()
    {
        return $this->hasMany(Timetable::class, 'courseId', 'id');
    }

    public function questions()
    {
        return $this->hasMany(Question::class, 'courseId', 'id');
    }
}
