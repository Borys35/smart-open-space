import { useAuthStore, type User } from "@/stores/auth";
import { api } from "@/lib/api";

export function useAuth() {
  const token = useAuthStore((s) => s.token);
  const user = useAuthStore((s) => s.user);
  const setAuth = useAuthStore((s) => s.setAuth);
  const logout = useAuthStore((s) => s.logout);

  const login = async (email: string, password: string) => {
    const data = await api.post<{ access_token: string; user: User }>("/login", { email, password });
    setAuth(data.access_token, data.user);
  };

  const register = async (username: string, email: string, password: string) => {
    await api.post("/register", { username, email, password });
    await login(email, password);
  };

  return { token, user, isAuthenticated: !!token, login, logout, register };
}
