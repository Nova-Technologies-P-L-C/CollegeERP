<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;
use App\Services\ClerkService;
use App\Models\User;
use Illuminate\Support\Facades\Auth;

class ClerkAuthMiddleware
{
    protected ClerkService $clerkService;

    public function __construct(ClerkService $clerkService)
    {
        $this->clerkService = $clerkService;
    }

    /**
     * Handle an incoming request.
     */
    public function handle(Request $request, Closure $next): Response
    {
        $header = $request->header('Authorization');

        if (!$header || !preg_match('/Bearer\s(\S+)/', $header, $matches)) {
            return response()->json(['error' => 'Unauthorized'], 401);
        }

        $token = $matches[1];
        $payload = $this->clerkService->verifyToken($token);

        if (!$payload || !isset($payload->sub)) {
            return response()->json(['error' => 'Invalid or expired authentication token'], 401);
        }

        $clerkId = $payload->sub;

        // Find or provision user
        $user = User::with(['student', 'faculty', 'admin'])->where('clerkId', $clerkId)->first();

        if (!$user) {
            // Fetch user info from Clerk
            $clerkUser = $this->clerkService->getUserFromClerk($clerkId);
            $email = null;
            $name = null;
            $role = 'STUDENT';

            if ($clerkUser) {
                if (!empty($clerkUser['email_addresses'])) {
                    $email = $clerkUser['email_addresses'][0]['email_address'] ?? null;
                }
                $firstName = $clerkUser['first_name'] ?? '';
                $lastName = $clerkUser['last_name'] ?? '';
                $name = trim("$firstName $lastName") ?: ($email ? explode('@', $email)[0] : 'User');

                if (!empty($clerkUser['public_metadata']['role'])) {
                    $role = strtoupper($clerkUser['public_metadata']['role']);
                }
            }

            // Fallback email if still null
            if (!$email) {
                $email = "{$clerkId}@college.local";
            }

            // Check if user exists by email (linked account)
            $user = User::where('email', $email)->first();
            if ($user) {
                $user->clerkId = $clerkId;
                if ($name && !$user->name) $user->name = $name;
                $user->save();
            } else {
                $user = User::create([
                    'clerkId' => $clerkId,
                    'email' => $email,
                    'name' => $name,
                    'role' => in_array($role, ['ADMIN', 'FACULTY', 'STUDENT']) ? $role : 'STUDENT',
                ]);
            }
        }

        Auth::setUser($user);
        $request->attributes->set('clerk_user_id', $clerkId);
        $request->attributes->set('user', $user);

        return $next($request);
    }
}
