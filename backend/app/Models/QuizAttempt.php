<?php

namespace App\Models;

class QuizAttempt extends BaseModel
{
    protected $table = 'QuizAttempt';
    public $timestamps = false;

    protected $casts = [
        'score' => 'integer',
        'totalMarks' => 'integer',
        'submittedAt' => 'datetime',
        'answers' => 'array',
    ];

    public function quiz()
    {
        return $this->belongsTo(Quiz::class, 'quizId', 'id');
    }

    public function student()
    {
        return $this->belongsTo(Student::class, 'studentId', 'id');
    }
}
