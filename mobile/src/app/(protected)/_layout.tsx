import { ProtectedTabs } from "@/components/layouts/tabs";
import { ensureGateCredential } from "@/lib/gate-credential";
import { useAuthStore } from "@/stores/auth";
import { useEffect } from "react";

export default function ProtectedLayout() {
  const userId = useAuthStore((state) => state.user?.id);

  useEffect(() => {
    if (!userId) {
      return;
    }

    ensureGateCredential(userId).catch((error) => {
      console.warn("Failed to provision gate credential", error);
    });
  }, [userId]);

  return <ProtectedTabs />;
}
