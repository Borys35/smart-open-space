import { useAuth } from "@/hooks/use-auth";
import { Redirect } from "expo-router";

export default function Index() {
  const { isAuthenticated } = useAuth();

  return isAuthenticated ? <Redirect href="/index" /> : <Redirect href="/(auth)/sign-in" />;
}
