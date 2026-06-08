import { api } from "@/lib/api";
import { useMutation, useQueries, useQuery, useQueryClient } from "@tanstack/react-query";

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

export interface DeskAvailabilityWindow {
  start_time: string;
  end_time: string;
  duration_minutes: number;
}

export interface DeskAvailabilityWindowsResponse {
  desk_id: number;
  date: string;
  windows: DeskAvailabilityWindow[];
}

export interface DeskAvailabilityWindowsResult extends DeskAvailabilityWindowsResponse {
  deskLabel?: string | null;
}

export interface ReservationCreate {
  desk_id: number;
  start_time: string;
  end_time: string;
}

export interface ReservationResponse {
  id: number;
  desk_id: number;
  desk_label: string | null;
  open_space: {
    id: number;
    name: string;
    building: string | null;
    floor: number;
    address: string | null;
    place_name: string | null;
    image_url: string | null;
  };
  start_time: string;
  end_time: string;
  credit_cost: number;
  status: string;
}

const ACTIVE_RESERVATION_STATUSES = new Set(["CONFIRMED", "PENDING"]);

function getReservationDistanceFromNow(reservation: ReservationResponse, now: number) {
  const start = new Date(reservation.start_time).getTime();
  const end = new Date(reservation.end_time).getTime();

  if (start <= now && now <= end) {
    return 0;
  }

  return Math.min(Math.abs(start - now), Math.abs(end - now));
}

function sortReservationsByDistanceFromNow(reservations: ReservationResponse[]) {
  const now = Date.now();

  return [...reservations].sort(
    (a, b) => getReservationDistanceFromNow(a, now) - getReservationDistanceFromNow(b, now),
  );
}

export const openSpaceKeys = {
  list: (userId: number | null) => ["open-spaces", userId] as const,
  detail: (openSpaceId: number | null) => ["open-spaces", "detail", openSpaceId] as const,
  availability: (openSpaceId: number | null, startTime: string, endTime: string) =>
    ["open-spaces", "availability", openSpaceId, startTime, endTime] as const,
  deskAvailabilityWindows: (deskId: number | null, date: string, minDurationMinutes: number) =>
    ["desks", "availability-windows", deskId, date, minDurationMinutes] as const,
  myReservations: () => ["reservations", "my"] as const,
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

export function useDeskAvailabilityWindows(
  deskId: number | null,
  date: string,
  minDurationMinutes = 10,
) {
  return useQuery({
    queryKey: openSpaceKeys.deskAvailabilityWindows(deskId, date, minDurationMinutes),
    queryFn: () =>
      api.get<DeskAvailabilityWindowsResponse>(
        `/api/desks/${deskId}/availability-windows?date=${date}&min_duration_minutes=${minDurationMinutes}`,
      ),
    enabled: deskId !== null && date.length > 0,
  });
}

export function useDesksAvailabilityWindows(
  desks: Pick<DeskAvailability, "id" | "data">[],
  date: string,
  minDurationMinutes = 10,
) {
  return useQueries({
    queries: desks.map((desk) => ({
      queryKey: openSpaceKeys.deskAvailabilityWindows(desk.id, date, minDurationMinutes),
      queryFn: async () => {
        const response = await api.get<DeskAvailabilityWindowsResponse>(
          `/api/desks/${desk.id}/availability-windows?date=${date}&min_duration_minutes=${minDurationMinutes}`,
        );

        return {
          ...response,
          deskLabel: desk.data ?? null,
        } satisfies DeskAvailabilityWindowsResult;
      },
      enabled: date.length > 0,
    })),
  });
}

export function useMyReservations() {
  return useQuery({
    queryKey: openSpaceKeys.myReservations(),
    queryFn: () => api.get<ReservationResponse[]>("/api/reservations/my"),
    select: sortReservationsByDistanceFromNow,
  });
}

export function useActiveReservations() {
  const reservations = useMyReservations();

  return {
    ...reservations,
    data:
      reservations.data?.filter((reservation) =>
        ACTIVE_RESERVATION_STATUSES.has(reservation.status),
      ) ?? [],
  };
}

export function useCreateReservation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: ReservationCreate) =>
      api.post<ReservationResponse>("/api/reservations", data),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: openSpaceKeys.myReservations() });
      await queryClient.invalidateQueries({ queryKey: ["desks", "availability-windows"] });
      await queryClient.invalidateQueries({ queryKey: ["open-spaces", "availability"] });
    },
  });
}

export function useCancelReservation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (reservationId: number) => api.delete<void>(`/api/reservations/${reservationId}`),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: openSpaceKeys.myReservations() });
      await queryClient.invalidateQueries({ queryKey: ["desks", "availability-windows"] });
      await queryClient.invalidateQueries({ queryKey: ["open-spaces", "availability"] });
    },
  });
}
