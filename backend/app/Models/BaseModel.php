<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Str;

class BaseModel extends Model
{
    public $incrementing = false;
    protected $keyType = 'string';

    const CREATED_AT = 'createdAt';
    const UPDATED_AT = 'updatedAt';

    protected $guarded = [];

    protected static function boot()
    {
        parent::boot();

        static::creating(function ($model) {
            $key = $model->getKeyName();
            if (empty($model->{$key})) {
                $model->{$key} = (string) Str::uuid();
            }
        });
    }
}
