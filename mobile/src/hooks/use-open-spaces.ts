import { api } from "@/lib/api";
import { useQuery } from "@tanstack/react-query";

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

export const openSpaceKeys = {
  list: (userId: number | null) => ["open-spaces", userId] as const,
};

export function useOpenSpaces(userId: number | null) {
  return useQuery({
    queryKey: openSpaceKeys.list(userId),
    queryFn: () => api.get<MobileOpenSpaceSummary[]>("/api/open-spaces"),
    enabled: userId !== null,
  });
}
