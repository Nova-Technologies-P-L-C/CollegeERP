<?php

namespace App\Models;

class Fee extends BaseModel
{
    protected $table = 'Fee';
    public $timestamps = false;

    protected $casts = [
        'amount' => 'float',
        'dueDate' => 'datetime',
        'paidDate' => 'datetime',
        'semester' => 'integer',
    ];

    public function student()
    {
        return $this->belongsTo(Student::class, 'studentId', 'id');
    }
}
