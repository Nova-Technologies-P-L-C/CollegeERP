<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class RequireRoleMiddleware
{
    /**
     * Handle an incoming request.
     * Usage in routes: ->middleware('role:ADMIN,FACULTY')
     */
    public function handle(Request $request, Closure $next, ...$roles): Response
    {
        $user = $request->attributes->get('user') ?? auth()->user();

        if (!$user) {
            return response()->json(['error' => 'Unauthorized'], 401);
        }

        // Normalize roles to uppercase
        $allowed = array_map('strtoupper', $roles);

        if (!in_array(strtoupper($user->role), $allowed)) {
            return response()->json(['error' => 'Forbidden'], 403);
        }

        return $next($request);
    }
}
