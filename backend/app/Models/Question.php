<?php

namespace App\Models;

class Question extends BaseModel
{
    protected $table = 'Question';

    const CREATED_AT = 'createdAt';
    const UPDATED_AT = null; // Question only has createdAt

    protected $casts = [
        'options' => \App\Casts\PgArray::class,
        'correctOption' => 'integer',
        'marks' => 'integer',
        'createdAt' => 'datetime',
    ];

    public function course()
    {
        return $this->belongsTo(Course::class, 'courseId', 'id');
    }

    public function quiz()
    {
        return $this->belongsTo(Quiz::class, 'quizId', 'id');
    }
}
