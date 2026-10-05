<?php

namespace App\Models;

use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Illuminate\Support\Str;
use Laravel\Sanctum\HasApiTokens;

class User extends Authenticatable
{
    use HasApiTokens, Notifiable;

    protected $table = 'User';
    public $incrementing = false;
    protected $keyType = 'string';

    const CREATED_AT = 'createdAt';
    const UPDATED_AT = 'updatedAt';

    protected $guarded = [];

    protected $hidden = [
        'password',
    ];

    protected static function boot()
    {
        parent::boot();

        static::creating(function ($model) {
            if (empty($model->{$model->getKeyName()})) {
                $model->{$model->getKeyName()} = (string) Str::uuid();
            }
        });
    }

    public function student()
    {
        return $this->hasOne(Student::class, 'userId', 'id');
    }

    public function faculty()
    {
        return $this->hasOne(Faculty::class, 'userId', 'id');
    }

    public function admin()
    {
        return $this->hasOne(Admin::class, 'userId', 'id');
    }

    public function auditLogs()
    {
        return $this->hasMany(AuditLog::class, 'adminId', 'clerkId');
    }
}
