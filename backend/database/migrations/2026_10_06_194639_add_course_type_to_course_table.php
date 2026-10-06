<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('Course', function (Blueprint $table) {
            $table->string('courseType')->default('COMPULSORY');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('Course', function (Blueprint $table) {
            $table->dropColumn('courseType');
        });
    }
};
