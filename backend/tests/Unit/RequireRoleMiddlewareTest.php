<?php

namespace Tests\Unit;

use App\Http\Middleware\RequireRoleMiddleware;
use App\Models\Admin;
use App\Models\User;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;
use Tests\TestCase;

class RequireRoleMiddlewareTest extends TestCase
{
    private RequireRoleMiddleware $middleware;

    protected function setUp(): void
    {
        parent::setUp();
        $this->middleware = new RequireRoleMiddleware();
    }

    public function test_it_returns_401_when_user_is_not_authenticated(): void
    {
        $request = Request::create('/api/students', 'GET');
        $next = function () {
            return response()->json(['success' => true]);
        };

        $response = $this->middleware->handle($request, $next, 'ADMIN');

        $this->assertEquals(401, $response->getStatusCode());
    }

    public function test_it_allows_faculty_for_faculty_routes(): void
    {
        $user = new User(['id' => 'u_fac', 'role' => 'FACULTY']);
        $request = Request::create('/api/courses', 'GET');
        $request->attributes->set('user', $user);

        $next = function () {
            return response()->json(['success' => true]);
        };

        $response = $this->middleware->handle($request, $next, 'FACULTY');

        $this->assertEquals(200, $response->getStatusCode());
    }

    public function test_it_blocks_faculty_from_admin_only_routes(): void
    {
        $user = new User(['id' => 'u_fac', 'role' => 'FACULTY']);
        $request = Request::create('/api/users', 'GET');
        $request->attributes->set('user', $user);

        $next = function () {
            return response()->json(['success' => true]);
        };

        $response = $this->middleware->handle($request, $next, 'ADMIN');

        $this->assertEquals(403, $response->getStatusCode());
    }

    public function test_it_allows_branch_admin_on_general_admin_routes(): void
    {
        $user = new User(['id' => 'u_admin', 'role' => 'ADMIN']);
        $admin = new Admin(['adminType' => 'BRANCH_ADMIN']);
        $user->setRelation('admin', $admin);

        $request = Request::create('/api/courses', 'POST');
        $request->attributes->set('user', $user);

        $next = function () {
            return response()->json(['success' => true]);
        };

        $response = $this->middleware->handle($request, $next, 'ADMIN');

        $this->assertEquals(200, $response->getStatusCode());
    }

    public function test_it_blocks_accountant_from_registrar_routes(): void
    {
        $user = new User(['id' => 'u_acc', 'role' => 'ADMIN']);
        $admin = new Admin(['adminType' => 'ACCOUNTANT']);
        $user->setRelation('admin', $admin);

        $request = Request::create('/api/admissions', 'POST');
        $request->attributes->set('user', $user);

        $next = function () {
            return response()->json(['success' => true]);
        };

        $response = $this->middleware->handle($request, $next, 'REGISTRAR');

        $this->assertEquals(403, $response->getStatusCode());
    }

    public function test_it_allows_accountant_on_accountant_allowed_routes(): void
    {
        $user = new User(['id' => 'u_acc', 'role' => 'ADMIN']);
        $admin = new Admin(['adminType' => 'ACCOUNTANT']);
        $user->setRelation('admin', $admin);

        $request = Request::create('/api/fees', 'GET');
        $request->attributes->set('user', $user);

        $next = function () {
            return response()->json(['success' => true]);
        };

        $response = $this->middleware->handle($request, $next, 'ADMIN', 'ACCOUNTANT');

        $this->assertEquals(200, $response->getStatusCode());
    }
}
