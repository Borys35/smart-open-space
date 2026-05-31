import { api } from "@/lib/api";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

export interface Invitation {
  id: number;
  user_id: number | null;
  space_id: number;
  invited_email: string;
  status: "PENDING" | "ACCEPTED" | "REJECTED" | "EXPIRED";
  open_space: MobileOpenSpaceSummary | null;
}

export interface MobileOpenSpaceSummary {
  id: number;
  name: string;
  building: string | null;
  floor: number;
  address: string | null;
  place_name: string | null;
  latitude: number | null;
  longitude: number | null;
  image_url: string | null;
  opened_at: string | null;
  closed_at: string | null;
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
    },
  });
}
