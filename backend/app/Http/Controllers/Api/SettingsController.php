<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\SystemSettings;
use App\Services\AuditLogService;
use Carbon\Carbon;
use Illuminate\Support\Str;

class SettingsController extends Controller
{
    private function generateSecret(): string
    {
        $chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
        $result = '';
        for ($i = 0; $i < 6; $i++) {
            $result .= $chars[random_int(0, strlen($chars) - 1)];
        }
        return 'GGC-' . $result;
    }

    public function getAdminSecret()
    {
        $secretSetting = SystemSettings::where('key', 'admin_onboarding_secret')->first();
        $expiresSetting = SystemSettings::where('key', 'admin_onboarding_secret_expires_at')->first();

        if (!$secretSetting || empty($secretSetting->value)) {
            return response()->json(['secret' => '']);
        }

        $now = Carbon::now();
        $expiresAt = $expiresSetting && !empty($expiresSetting->value)
            ? Carbon::parse($expiresSetting->value)
            : ($secretSetting->updatedAt ? $secretSetting->updatedAt->addHour() : $now->subMinute());

        if ($now->greaterThanOrEqualTo($expiresAt)) {
            return response()->json(['secret' => '']);
        }

        return response()->json([
            'secret' => $secretSetting->value,
            'expiresAt' => $expiresAt->toIso8601String(),
        ]);
    }

    public function createAdminSecret(Request $request)
    {
        $admin = $request->attributes->get('user') ?? auth()->user();

        $expiryHours = 1;
        if ($request->has('expiryHours') && is_numeric($request->input('expiryHours')) && $request->input('expiryHours') > 0) {
            $expiryHours = (int) $request->input('expiryHours');
        }

        $secret = $this->generateSecret();
        $expiresAt = Carbon::now()->addHours($expiryHours);

        SystemSettings::updateOrCreate(
            ['key' => 'admin_onboarding_secret'],
            ['value' => $secret]
        );

        SystemSettings::updateOrCreate(
            ['key' => 'admin_onboarding_secret_expires_at'],
            ['value' => $expiresAt->toIso8601String()]
        );

        AuditLogService::log(
            'UPDATED',
            'SystemSettings',
            'admin_onboarding_secret',
            "Generated new admin onboarding secret (expires in {$expiryHours}h)",
            $admin->clerkId ?? null,
            $admin->name ?? null
        );

        return response()->json([
            'success' => true,
            'secret' => $secret,
            'expiresAt' => $expiresAt->toIso8601String(),
        ]);
    }
}
