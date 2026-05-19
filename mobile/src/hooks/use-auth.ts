import { useAuthStore } from "@/stores/auth";

const API_URL = "http://10.0.2.2:8000";

export function useAuth() {
  const token = useAuthStore((s) => s.token);
  const user = useAuthStore((s) => s.user);
  const setAuth = useAuthStore((s) => s.setAuth);
  const logout = useAuthStore((s) => s.logout);

  const login = async (email: string, password: string) => {
    const res = await fetch(`${API_URL}/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });

    if (!res.ok) {
      console.warn(`[auth] login failed: ${res.status} ${res.statusText}`);
      const err = await res.json();
      throw new Error(err.detail ?? "Login failed");
    }

    const data = await res.json();
    setAuth(data.access_token, data.user);
  };

  const register = async (username: string, email: string, password: string) => {
    const res = await fetch(`${API_URL}/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, email, password }),
    });

    if (!res.ok) {
      console.warn(`[auth] register failed: ${res.status} ${res.statusText}`);
      const err = await res.json();
      throw new Error(err.detail ?? "Registration failed");
    }

    await login(email, password);
  };

  const isAuthenticated = !!token;
  return { token, user, isAuthenticated, login, logout, register };
}
