import axios from "axios";

export const api = axios.create({
  withCredentials: true,
  headers: {
    "Content-Type": "application/json",
  },
});

if (typeof window !== "undefined") {
  api.interceptors.request.use((config) => {
    try {
      const sanctumToken = localStorage.getItem("auth_token");
      if (sanctumToken) {
        config.headers.Authorization = `Bearer ${sanctumToken}`;
      } else {
        // Fallback for Clerk instance if available
        // @ts-expect-error - Clerk attached dynamically
        const clerk = window.Clerk;
        const clerkToken = clerk?.session?.getToken?.();
        if (clerkToken) {
          config.headers.Authorization = `Bearer ${clerkToken}`;
        }
      }
    } catch (error) {
      console.error("Error setting authorization header:", error);
    }
    return config;
  });
}

