import { openSpaceKeys } from "@/hooks/use-open-spaces";
import { api } from "@/lib/api";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import type { MobileOpenSpaceSummary } from "@/hooks/use-open-spaces";

export interface Invitation {
  id: number;
  user_id: number | null;
  space_id: number;
  invited_email: string;
  status: "PENDING" | "ACCEPTED" | "REJECTED" | "EXPIRED";
  open_space: MobileOpenSpaceSummary | null;
}

const inviteKeys = {
  list: (userId: number | null) => ["invites", userId] as const,
};

export function useInvites(userId: number | null) {
  return useQuery({
    queryKey: inviteKeys.list(userId),
    queryFn: () => api.get<Invitation[]>("/api/invites"),
    enabled: userId !== null,
  });
}

export function useRespondToInvite(userId: number | null, action: "accept" | "reject") {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (inviteId: number) => api.post<null>(`/api/invites/${inviteId}/${action}`),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: inviteKeys.list(userId) });
      await queryClient.invalidateQueries({ queryKey: openSpaceKeys.list(userId) });
    },
  });
}
