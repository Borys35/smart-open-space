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

export interface DeskAvailability {
  id: number;
  data: string | null;
  x: number;
  y: number;
  width: number;
  height: number;
  available: boolean;
}

export const openSpaceKeys = {
  list: (userId: number | null) => ["open-spaces", userId] as const,
  detail: (openSpaceId: number | null) => ["open-spaces", "detail", openSpaceId] as const,
  availability: (openSpaceId: number | null, startTime: string, endTime: string) =>
    ["open-spaces", "availability", openSpaceId, startTime, endTime] as const,
};

export function useOpenSpaces(userId: number | null) {
  return useQuery({
    queryKey: openSpaceKeys.list(userId),
    queryFn: () => api.get<MobileOpenSpaceSummary[]>("/api/open-spaces"),
    enabled: userId !== null,
  });
}

export function useOpenSpaceDetails(openSpaceId: number | null) {
  return useQuery({
    queryKey: openSpaceKeys.detail(openSpaceId),
    queryFn: () => api.get<MobileOpenSpaceSummary>(`/api/open-spaces/${openSpaceId}`),
    enabled: openSpaceId !== null,
  });
}

export function useDeskAvailability(
  openSpaceId: number | null,
  startTime: string,
  endTime: string,
) {
  return useQuery({
    queryKey: openSpaceKeys.availability(openSpaceId, startTime, endTime),
    queryFn: () =>
      api.get<DeskAvailability[]>(
        `/api/reservations/availability?open_space_id=${openSpaceId}&start_time=${encodeURIComponent(
          startTime,
        )}&end_time=${encodeURIComponent(endTime)}`,
      ),
    enabled: openSpaceId !== null,
  });
}
