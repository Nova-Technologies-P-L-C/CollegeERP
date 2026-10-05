<?php

namespace App\Models;

class Admin extends BaseModel
{
    protected $table = 'Admin';
    public $timestamps = false;

    public function user()
    {
        return $this->belongsTo(User::class, 'userId', 'id');
    }
}
