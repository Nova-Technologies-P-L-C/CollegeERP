<?php

namespace App\Models;

class Quiz extends BaseModel
{
    protected $table = 'Quiz';
    public $timestamps = false;

    protected $casts = [
        'duration' => 'integer',
        'totalMarks' => 'integer',
        'dueDate' => 'datetime',
    ];

    public function course()
    {
        return $this->belongsTo(Course::class, 'courseId', 'id');
    }

    public function questions()
    {
        return $this->hasMany(Question::class, 'quizId', 'id');
    }

    public function attempts()
    {
        return $this->hasMany(QuizAttempt::class, 'quizId', 'id');
    }
}
