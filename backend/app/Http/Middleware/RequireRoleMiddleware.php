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
        $userRole = strtoupper($user->role);

        // Direct match for non-admin roles (FACULTY, STUDENT)
        if (in_array($userRole, ['FACULTY', 'STUDENT'])) {
            if (in_array($userRole, $allowed)) {
                return $next($request);
            }
            return response()->json(['error' => 'Forbidden'], 403);
        }

        // If user is an ADMIN, inspect their specific adminType
        if ($userRole === 'ADMIN') {
            if (!$user->relationLoaded('admin')) {
                $user->load('admin');
            }
            $adminType = $user->admin ? strtoupper($user->admin->adminType) : 'BRANCH_ADMIN';

            // Platform Admin and Branch Admin hold full ADMIN administrative privileges
            if (in_array($adminType, ['PLATFORM_ADMIN', 'BRANCH_ADMIN']) && in_array('ADMIN', $allowed)) {
                return $next($request);
            }

            // Check if user's specific adminType (REGISTRAR, ACCOUNTANT, ORG_ADMIN) is allowed
            if (in_array($adminType, $allowed)) {
                return $next($request);
            }

            // General ADMIN allowed if not restricted to specialized desks
            if (in_array('ADMIN', $allowed) && !in_array($adminType, ['REGISTRAR', 'ACCOUNTANT', 'ORG_ADMIN'])) {
                return $next($request);
            }

            return response()->json([
                'error' => "Forbidden: insufficient permissions for {$adminType}"
            ], 403);
        }

        return response()->json(['error' => 'Forbidden'], 403);
    }
}
