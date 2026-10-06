<?php

namespace App\Models;

class Branch extends BaseModel
{
    protected $table = 'Branch';

    protected $fillable = [
        'id',
        'name',
        'code',
        'city',
        'address',
        'phone',
        'email',
        'status',
        'approvedAt',
        'approvedBy',
        'isHead',
        'parentId',
    ];

    protected $casts = [
        'isHead' => 'boolean',
        'approvedAt' => 'datetime',
    ];

    public function parent()
    {
        return $this->belongsTo(Branch::class, 'parentId');
    }

    public function subBranches()
    {
        return $this->hasMany(Branch::class, 'parentId');
    }

    public function users()
    {
        return $this->hasMany(User::class, 'branchId');
    }

    public function students()
    {
        return $this->hasMany(Student::class, 'branchId');
    }

    public function faculty()
    {
        return $this->hasMany(Faculty::class, 'branchId');
    }

    public function courses()
    {
        return $this->hasMany(Course::class, 'branchId');
    }
}
