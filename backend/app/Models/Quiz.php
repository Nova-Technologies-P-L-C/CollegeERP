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

    protected $appends = ['_count'];

    public function getCountAttribute(): array
    {
        return [
            'questions' => (int) ($this->attributes['questions_count'] ?? $this->questions_count ?? 0),
            'attempts' => (int) ($this->attributes['attempts_count'] ?? $this->attempts_count ?? 0),
        ];
    }

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
