import { api } from "@/lib/api";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

export interface LinkedCard {
  uid: string;
  active: boolean;
}

interface CredentialsResponse {
  card: LinkedCard | null;
}

export const cardKeys = {
  linked: () => ["credentials", "cards", "linked"] as const,
};

export function useLinkedCard() {
  return useQuery({
    queryKey: cardKeys.linked(),
    queryFn: async () => {
      const credentials = await api.get<CredentialsResponse>("/api/credentials");
      return credentials.card;
    },
    retry: false,
  });
}

export function useUnlinkCard() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => api.delete<void>("/api/credentials/cards"),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: cardKeys.linked() });
    },
  });
}
