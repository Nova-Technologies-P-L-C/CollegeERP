<?php

namespace App\Models;

class Student extends BaseModel
{
    protected $table = 'Student';

    public $timestamps = false; // Note: Prisma Student doesn't have createdAt/updatedAt, has enrollmentDate

    protected $casts = [
        'enrollmentDate' => 'datetime',
        'graduationDate' => 'datetime',
        'leftDate' => 'datetime',
        'cgpa' => 'float',
        'percentage' => 'float',
        'blocked' => 'boolean',
        'readmitRequested' => 'boolean',
        'semester' => 'integer',
        'part' => 'integer',
    ];

    public function user()
    {
        return $this->belongsTo(User::class, 'userId', 'id');
    }

    public function attendances()
    {
        return $this->hasMany(Attendance::class, 'studentId', 'id');
    }

    public function enrollments()
    {
        return $this->hasMany(Enrollment::class, 'studentId', 'id');
    }

    public function fees()
    {
        return $this->hasMany(Fee::class, 'studentId', 'id');
    }

    public function feedbacks()
    {
        return $this->hasMany(Feedback::class, 'studentId', 'id');
    }

    public function grades()
    {
        return $this->hasMany(Grade::class, 'studentId', 'id');
    }

    public function quizAttempts()
    {
        return $this->hasMany(QuizAttempt::class, 'studentId', 'id');
    }
}
