import { api } from "@/lib/api";
import { useAuthStore, type User } from "@/stores/auth";
import { useQueryClient } from "@tanstack/react-query";

export function useAuth() {
  const queryClient = useQueryClient();

  const token = useAuthStore((s) => s.token);
  const user = useAuthStore((s) => s.user);
  const setAuth = useAuthStore((s) => s.setAuth);
  const logoutInternal = useAuthStore((s) => s.logout);

  const login = async (email: string, password: string) => {
    const data = await api.post<{ access_token: string; user: User }>("/login", {
      email: email.trim(),
      password,
    });
    setAuth(data.access_token, data.user);
  };

  const register = async (username: string, email: string, password: string) => {
    await api.post("/register", { username, email: email.trim(), password });
    await login(email, password);
  };

  const logout = () => {
    logoutInternal();

    queryClient.removeQueries({
      queryKey: ["invites"],
      exact: false,
    });
  };

  return { token, user, isAuthenticated: !!token, login, logout, register };
}
