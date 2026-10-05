<?php

namespace App\Services;

use Firebase\JWT\JWT;
use Firebase\JWT\JWK;
use Firebase\JWT\Key;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class ClerkService
{
    protected string $frontendApi;
    protected ?string $secretKey;

    public function __construct()
    {
        $this->frontendApi = rtrim(config('services.clerk.frontend_api', 'https://harmless-mosquito-9558.clerk.accounts.dev'), '/');
        $this->secretKey = config('services.clerk.secret_key');
    }

    /**
     * Get Clerk JWKS public keys, cached for 24 hours.
     */
    public function getJwks(): array
    {
        return Cache::remember('clerk_jwks', 86400, function () {
            $response = Http::timeout(10)->get("{$this->frontendApi}/.well-known/jwks.json");
            if ($response->successful()) {
                return $response->json();
            }
            throw new \Exception("Failed to fetch Clerk JWKS: " . $response->body());
        });
    }

    /**
     * Decode and verify a Clerk JWT token.
     * Returns the payload object or null on failure.
     */
    public function verifyToken(string $token): ?object
    {
        try {
            $jwks = $this->getJwks();
            $keys = JWK::parseKeySet($jwks);

            // Decode token using parsed JWK keys
            $payload = JWT::decode($token, $keys);

            // Check expiry
            if (isset($payload->exp) && $payload->exp < time()) {
                return null;
            }

            return $payload;
        } catch (\Exception $e) {
            Log::warning("Clerk JWT verification failed: " . $e->getMessage());

            // If verification failed due to key rotation, refresh cache once and retry
            try {
                Cache::forget('clerk_jwks');
                $jwks = $this->getJwks();
                $keys = JWK::parseKeySet($jwks);
                return JWT::decode($token, $keys);
            } catch (\Exception $retryException) {
                Log::error("Clerk JWT retry failed: " . $retryException->getMessage());
                return null;
            }
        }
    }

    /**
     * Fetch user profile directly from Clerk REST API.
     */
    public function getUserFromClerk(string $clerkId): ?array
    {
        if (!$this->secretKey) {
            return null;
        }

        try {
            $response = Http::withToken($this->secretKey)
                ->timeout(10)
                ->get("https://api.clerk.com/v1/users/{$clerkId}");

            if ($response->successful()) {
                return $response->json();
            }
        } catch (\Exception $e) {
            Log::error("Clerk API user fetch failed: " . $e->getMessage());
        }

        return null;
    }
}
