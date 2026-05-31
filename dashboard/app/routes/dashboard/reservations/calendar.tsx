
import { useEffect, useMemo, useState } from "react"
import { Link, useSearchParams } from "react-router"
import { Button } from "~/components/ui/button"
import { Input } from "~/components/ui/input"
import { useOpenSpace } from "~/providers/OpenSpaceProvider"

export const handle = {
    title: "Reservation calendar",
};

interface DeskResponseItem {
    id: number;
    data: string;
}

interface ReservationCalendarItem {
    id: number;
    desk_id: number;
    desk_label: string;
    username: string;
    start_time: string;
    end_time: string;
    status: "PENDING" | "CONFIRMED" | "CANCELLED" | "DONE";
}

interface ReservationsResponse {
    items: ReservationCalendarItem[];
    total: number;
    page: number;
    limit: number;
}

interface DeskOption {
    id: number;
    label: string;
}

const HOUR_WIDTH = 64
const DESK_LABEL_WIDTH = 160
const ROW_HEIGHT = 40
const HOURS_IN_DAY = 24

const STATUS_COLOR: Record<ReservationCalendarItem["status"], string> = {
    PENDING: "bg-amber-500/80 border-amber-600",
    CONFIRMED: "bg-emerald-500/80 border-emerald-600",
    CANCELLED: "bg-rose-500/80 border-rose-600",
    DONE: "bg-sky-500/80 border-sky-600",
}

function toDateInputValue(date: Date): string {
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, "0")
    const day = String(date.getDate()).padStart(2, "0")

    return `${year}-${month}-${day}`
}

function getTodayString(): string {
    return toDateInputValue(new Date())
}

function isDateInputValue(value: string | null): value is string {
    if (!value) {
        return false
    }

    return /^\d{4}-\d{2}-\d{2}$/.test(value)
}

function toLocalDateTimeString(dateString: string, hours: number, minutes: number, seconds: number): string {
    return `${dateString}T${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`
}

function addDays(dateString: string, daysToAdd: number): string {
    const date = new Date(`${dateString}T00:00:00`)
    date.setDate(date.getDate() + daysToAdd)

    return toDateInputValue(date)
}

function formatHour(hour: number): string {
    return `${String(hour).padStart(2, "0")}:00`
}

function formatReservationTimeRange(start: Date, end: Date): string {
    const startTime = `${String(start.getHours()).padStart(2, "0")}:${String(start.getMinutes()).padStart(2, "0")}`
    const endTime = `${String(end.getHours()).padStart(2, "0")}:${String(end.getMinutes()).padStart(2, "0")}`

    return `${startTime}-${endTime}`
}

async function fetchAllReservationsForDay(openSpaceId: number, selectedDate: string): Promise<ReservationCalendarItem[]> {
    const allItems: ReservationCalendarItem[] = []
    let page = 1
    const limit = 100
    let total = 0

    do {
        const params = new URLSearchParams({
            limit: String(limit),
            page: String(page),
            sort: "start_time_asc",
            date_from: toLocalDateTimeString(selectedDate, 0, 0, 0),
            date_to: toLocalDateTimeString(selectedDate, 23, 59, 59),
        })

        const response = await fetch(`/api/dashboard/open-spaces/${openSpaceId}/reservations?${params.toString()}`, {
            credentials: "include",
            headers: { Authorization: `Bearer ${localStorage.getItem("accessToken")}` },
        })

        if (!response.ok) {
            throw new Error("Failed to load calendar reservations")
        }

        const data = (await response.json()) as ReservationsResponse
        allItems.push(...data.items)
        total = data.total
        page += 1
    } while (allItems.length < total)

    return allItems
}

export default function ReservationCalendar() {
    const [searchParams, setSearchParams] = useSearchParams()
    const [selectedDate, setSelectedDate] = useState<string>(() => {
        const queryDate = searchParams.get("date")
        return isDateInputValue(queryDate) ? queryDate : getTodayString()
    })
    const [desks, setDesks] = useState<DeskOption[]>([])
    const [reservations, setReservations] = useState<ReservationCalendarItem[]>([])
    const [isLoading, setIsLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const { activeOpenSpace } = useOpenSpace()

    const dayStart = useMemo(() => new Date(`${selectedDate}T00:00:00`), [selectedDate])
    const dayEnd = useMemo(() => new Date(`${selectedDate}T24:00:00`), [selectedDate])

    useEffect(() => {
        const nextDate = searchParams.get("date")
        if (isDateInputValue(nextDate) && nextDate !== selectedDate) {
            setSelectedDate(nextDate)
        }
    }, [searchParams, selectedDate])

    useEffect(() => {
        if (!activeOpenSpace?.id) {
            setDesks([])
            return
        }

        fetch(`/api/dashboard/open-spaces/${activeOpenSpace.id}/desks`, {
            credentials: "include",
            headers: { Authorization: `Bearer ${localStorage.getItem("accessToken")}` },
        })
            .then((response) => {
                if (!response.ok) {
                    throw new Error("Failed to load desks")
                }

                return response.json()
            })
            .then((data: DeskResponseItem[]) => {
                if (!Array.isArray(data)) {
                    setDesks([])
                    return
                }

                setDesks(
                    data.map((desk) => ({
                        id: desk.id,
                        label: desk.data || `Desk ${desk.id}`,
                    }))
                )
            })
            .catch(() => {
                setDesks([])
            })
    }, [activeOpenSpace?.id])

    useEffect(() => {
        if (!activeOpenSpace?.id) {
            setReservations([])
            return
        }

        let isCancelled = false
        setIsLoading(true)
        setError(null)

        fetchAllReservationsForDay(activeOpenSpace.id, selectedDate)
            .then((items) => {
                if (isCancelled) {
                    return
                }
                setReservations(items)
            })
            .catch((fetchError: Error) => {
                if (isCancelled) {
                    return
                }
                setError(fetchError.message)
                setReservations([])
            })
            .finally(() => {
                if (!isCancelled) {
                    setIsLoading(false)
                }
            })

        return () => {
            isCancelled = true
        }
    }, [activeOpenSpace?.id, selectedDate])

    const desksWithReservations = useMemo(() => {
        const knownDesks = new Map<number, DeskOption>(desks.map((desk) => [desk.id, desk]))

        reservations.forEach((reservation) => {
            if (!knownDesks.has(reservation.desk_id)) {
                knownDesks.set(reservation.desk_id, {
                    id: reservation.desk_id,
                    label: reservation.desk_label || `Desk ${reservation.desk_id}`,
                })
            }
        })

        return Array.from(knownDesks.values()).sort((a, b) => a.label.localeCompare(b.label))
    }, [desks, reservations])

    const reservationsByDesk = useMemo(() => {
        const map = new Map<number, ReservationCalendarItem[]>()

        desksWithReservations.forEach((desk) => map.set(desk.id, []))

        reservations.forEach((reservation) => {
            const list = map.get(reservation.desk_id)
            if (!list) {
                map.set(reservation.desk_id, [reservation])
                return
            }
            list.push(reservation)
        })

        map.forEach((deskReservations) => {
            deskReservations.sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime())
        })

        return map
    }, [desksWithReservations, reservations])

    const handleDateChange = (nextDate: string) => {
        if (!nextDate || !isDateInputValue(nextDate)) {
            return
        }

        setSelectedDate(nextDate)

        const nextParams = new URLSearchParams(searchParams)
        nextParams.set("date", nextDate)
        setSearchParams(nextParams)
    }

    const navigateDay = (daysToAdd: number) => {
        handleDateChange(addDays(selectedDate, daysToAdd))
    }

    const timelineWidth = HOURS_IN_DAY * HOUR_WIDTH

    return (
        <div
            className="flex h-full min-h-0 min-w-0 w-full flex-col p-4 md:p-6 lg:p-8"
            style={{ maxWidth: "var(--dashboard-content-width)" }}
        >
            <h1 className="text-2xl font-bold mb-6">Calendar</h1>
            <div className="flex min-h-0 min-w-0 flex-1 flex-col gap-4 pt-2">
                <div className="flex shrink-0 flex-col gap-3 md:flex-row md:items-center md:justify-between">
                    <div className="flex min-w-0 flex-wrap items-center gap-2">
                        <Button variant="outline" size="sm" onClick={() => navigateDay(-1)}>Previous day</Button>
                        <Input
                            type="date"
                            value={selectedDate}
                            onChange={(event) => handleDateChange(event.target.value)}
                            className="w-fit max-w-full"
                        />
                        <Button variant="outline" size="sm" onClick={() => navigateDay(1)}>Next day</Button>
                    </div>
                    <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground md:justify-end">
                        <span className="inline-block h-2.5 w-2.5 rounded-full bg-emerald-500" />CONFIRMED
                        <span className="inline-block h-2.5 w-2.5 rounded-full bg-amber-500" />PENDING
                        <span className="inline-block h-2.5 w-2.5 rounded-full bg-rose-500" />CANCELLED
                        <span className="inline-block h-2.5 w-2.5 rounded-full bg-sky-500" />DONE
                    </div>
                </div>

                {error && (
                    <p className="text-sm text-center font-medium text-destructive">
                        {error}
                    </p>
                )}

                {isLoading ? (
                    <p className="text-sm text-center font-medium text-muted-foreground">
                        Loading reservations calendar...
                    </p>
                ) : desksWithReservations.length === 0 ? (
                    <p className="text-sm text-center font-medium text-muted-foreground">
                        No desks found for this open space.
                    </p>
                ) : (
                    <div className="min-h-0 min-w-0 flex-1 rounded-md border overflow-auto">
                        <div className="w-max h-full">
                            <div className="">
                                <div className="sticky top-0 z-20 flex border-b bg-muted/50 backdrop-blur-sm">
                                    <div
                                        className="sticky left-0 z-30 border-r bg-muted px-3 py-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground"
                                        style={{ width: DESK_LABEL_WIDTH, minWidth: DESK_LABEL_WIDTH }}
                                    >
                                        Desk
                                    </div>
                                    <div className="relative" style={{ width: timelineWidth }}>
                                        <div className="flex">
                                            {Array.from({ length: HOURS_IN_DAY }).map((_, hour) => (
                                                <div
                                                    key={hour}
                                                    className="border-r px-2 py-2 text-xs font-medium text-muted-foreground"
                                                    style={{ width: HOUR_WIDTH, minWidth: HOUR_WIDTH }}
                                                >
                                                    {formatHour(hour)}
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>

                                {desksWithReservations.map((desk) => {
                                    const deskReservations = reservationsByDesk.get(desk.id) ?? []

                                    return (
                                        <div key={desk.id} className="flex border-b last:border-b-0">
                                            <div
                                                className="sticky left-0 z-10 border-r bg-background px-3 py-2 text-sm font-medium"
                                                style={{ width: DESK_LABEL_WIDTH, minWidth: DESK_LABEL_WIDTH, height: ROW_HEIGHT }}
                                            >
                                                {desk.label}
                                            </div>

                                            <div className="relative" style={{ width: timelineWidth, height: ROW_HEIGHT }}>
                                                <div className="absolute inset-0 flex">
                                                    {Array.from({ length: HOURS_IN_DAY }).map((_, hour) => (
                                                        <div
                                                            key={`${desk.id}-${hour}`}
                                                            className="border-r"
                                                            style={{ width: HOUR_WIDTH, minWidth: HOUR_WIDTH }}
                                                        />
                                                    ))}
                                                </div>

                                                {deskReservations.map((reservation) => {
                                                    const reservationStart = new Date(reservation.start_time)
                                                    const reservationEnd = new Date(reservation.end_time)
                                                    const clippedStart = new Date(Math.max(reservationStart.getTime(), dayStart.getTime()))
                                                    const clippedEnd = new Date(Math.min(reservationEnd.getTime(), dayEnd.getTime()))

                                                    if (clippedEnd <= clippedStart) {
                                                        return null
                                                    }

                                                    const left = ((clippedStart.getTime() - dayStart.getTime()) / (60 * 60 * 1000)) * HOUR_WIDTH
                                                    const width = Math.max(((clippedEnd.getTime() - clippedStart.getTime()) / (60 * 60 * 1000)) * HOUR_WIDTH, 4)

                                                    return (
                                                        <Link to={`/reservations/${reservation.id}`}>
                                                            <div
                                                                key={reservation.id}
                                                                className={`absolute top-1.5 h-10.5 rounded-md border px-2 py-1 text-[11px] text-white shadow-sm ${STATUS_COLOR[reservation.status]}`}
                                                                style={{
                                                                    left,
                                                                    width,
                                                                }}
                                                                title={`${reservation.username} (${reservation.status}) ${formatReservationTimeRange(reservationStart, reservationEnd)}`}
                                                            >
                                                                <p className="truncate font-semibold leading-tight">{reservation.username}</p>
                                                                <p className="truncate leading-tight opacity-90">{formatReservationTimeRange(reservationStart, reservationEnd)}</p>
                                                            </div>
                                                        </Link>
                                                    )
                                                })}
                                            </div>
                                        </div>
                                    )
                                })}
                            </div>
                        </div>
                    </div>
                )}

            </div>
        </div>
    )
}
