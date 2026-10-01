import axios from "axios";

export const api = axios.create({
  withCredentials: true,
  headers: {
    "Content-Type": "application/json",
  },
});

if (typeof window !== "undefined") {
  api.interceptors.request.use(async (config) => {
    try {
      // Access Clerk instance dynamically from the window object
      // @ts-expect-error - Clerk is attached to window by ClerkProvider in browser context
      const clerk = window.Clerk;
      if (clerk?.session) {
        const token = await clerk.session.getToken();
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
      }
    } catch (error) {
      console.error("Error setting authorization header:", error);
    }
    return config;
  });
}

