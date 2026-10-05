<?php

namespace App\Models;

class Feedback extends BaseModel
{
    protected $table = 'Feedback';
    public $timestamps = false;

    protected $casts = [
        'rating' => 'integer',
        'date' => 'datetime',
    ];

    public function student()
    {
        return $this->belongsTo(Student::class, 'studentId', 'id');
    }
}
