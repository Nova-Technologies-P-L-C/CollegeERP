<?php

namespace App\Models;

class Grade extends BaseModel
{
    protected $table = 'Grade';
    public $timestamps = false;

    protected $casts = [
        'quizMarks' => 'float',
        'assignmentMarks' => 'float',
        'midMarks' => 'float',
        'finalMarks' => 'float',
        'total' => 'float',
        'gpa' => 'float',
        'locked' => 'boolean',
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
