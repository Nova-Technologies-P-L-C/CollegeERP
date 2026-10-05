<?php

namespace App\Models;

class Timetable extends BaseModel
{
    protected $table = 'Timetable';
    public $timestamps = false;

    public function course()
    {
        return $this->belongsTo(Course::class, 'courseId', 'id');
    }
}
