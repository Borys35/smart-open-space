import { useEffect, useState } from "react";
import { useSearchParams } from "react-router";
import { useOpenSpace } from "~/providers/OpenSpaceProvider";
import ReservationsFilters, {
    SORT_VALUES,
    STATUS_FILTER_VALUES,
    TIME_FILTER_VALUES,
    type ReservationSortValue,
    type ReservationStatusFilterValue,
    type ReservationTimeFilterValue,
} from "~/components/lists/reservations/reservations-filters";
import ReservationsList, { type ReservationListItem } from "~/components/lists/reservations/reservations-list";
import { ListPagination } from "~/components/lists/list-pagination";

export const handle = {
    title: "Reservations",
};

interface ReservationsResponse {
    items: ReservationListItem[];
    total: number;
    page: number;
    limit: number;
}

interface DeskResponseItem {
    id: number;
    data: string;
}

interface DeskOption {
    id: number;
    label: string;
}

function readPositiveNumber(value: string | null, fallback: number) {
    const parsedValue = Number(value)

    return Number.isInteger(parsedValue) && parsedValue > 0 ? parsedValue : fallback
}

function readSortValue(value: string | null): ReservationSortValue {
    return value && value in SORT_VALUES ? (value as ReservationSortValue) : "start_time_desc"
}

function readStatusValue(value: string | null): ReservationStatusFilterValue {
    return value && value in STATUS_FILTER_VALUES ? (value as ReservationStatusFilterValue) : "ALL"
}

function readDeskIdValue(value: string | null): string {
    if (!value) {
        return "ALL"
    }

    return Number.isInteger(Number(value)) && Number(value) > 0 ? value : "ALL"
}

function readTimeFilterValue(value: string | null, dateFrom: string, dateTo: string): ReservationTimeFilterValue {
    if (value && value in TIME_FILTER_VALUES) {
        return value as ReservationTimeFilterValue
    }

    return dateFrom || dateTo ? "custom" : "all"
}

function formatDateTimeLocal(date: Date): string {
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, "0")
    const day = String(date.getDate()).padStart(2, "0")
    const hour = String(date.getHours()).padStart(2, "0")
    const minute = String(date.getMinutes()).padStart(2, "0")

    return `${year}-${month}-${day}T${hour}:${minute}`
}

function getPresetRange(filter: ReservationTimeFilterValue): { dateFrom: string, dateTo: string } | null {
    const now = new Date()

    if (filter === "today") {
        const start = new Date(now)
        start.setHours(0, 0, 0, 0)
        const end = new Date(now)
        end.setHours(23, 59, 0, 0)

        return { dateFrom: formatDateTimeLocal(start), dateTo: formatDateTimeLocal(end) }
    }

    if (filter === "next_7_days") {
        const end = new Date(now)
        end.setDate(end.getDate() + 7)

        return { dateFrom: formatDateTimeLocal(now), dateTo: formatDateTimeLocal(end) }
    }

    if (filter === "this_month") {
        const start = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0)
        const end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 0, 0)

        return { dateFrom: formatDateTimeLocal(start), dateTo: formatDateTimeLocal(end) }
    }

    return null
}


export default function Reservations() {
    const [searchParams, setSearchParams] = useSearchParams()
    const [reservations, setReservations] = useState<ReservationListItem[]>([])
    const [page, setPage] = useState(() => readPositiveNumber(searchParams.get("page"), 1))
    const [total, setTotal] = useState(0)
    const [limit, setLimit] = useState(() => readPositiveNumber(searchParams.get("limit"), 10))
    const [sort, setSort] = useState<ReservationSortValue>(() => readSortValue(searchParams.get("sort")))
    const [status, setStatus] = useState<ReservationStatusFilterValue>(() => readStatusValue(searchParams.get("status")))
    const [deskId, setDeskId] = useState(() => readDeskIdValue(searchParams.get("desk_id")))
    const [dateFrom, setDateFrom] = useState(() => searchParams.get("date_from") ?? "")
    const [dateTo, setDateTo] = useState(() => searchParams.get("date_to") ?? "")
    const [timeFilter, setTimeFilter] = useState<ReservationTimeFilterValue>(() => readTimeFilterValue(searchParams.get("time_filter"), searchParams.get("date_from") ?? "", searchParams.get("date_to") ?? ""))
    const [deskOptions, setDeskOptions] = useState<DeskOption[]>([])
    const [error, setError] = useState<string | null>(null)
    const [isLoading, setIsLoading] = useState(true)
    const { activeOpenSpace } = useOpenSpace()

    useEffect(() => {
        if (!activeOpenSpace?.id) {
            setDeskOptions([])
            return
        }

        fetch(`/api/dashboard/open-spaces/${activeOpenSpace.id}/desks`, {
            credentials: "include",
            headers: { "Authorization": "Bearer " + localStorage.getItem("accessToken") },
        })
            .then((response) => {
                if (!response.ok) {
                    throw new Error("Failed to load desks")
                }

                return response.json()
            })
            .then((data: DeskResponseItem[]) => {
                if (!Array.isArray(data)) {
                    setDeskOptions([])
                    return
                }

                setDeskOptions(
                    data.map((desk) => ({
                        id: desk.id,
                        label: desk.data,
                    }))
                )
            })
            .catch(() => {
                setDeskOptions([])
            })
    }, [activeOpenSpace?.id])

    useEffect(() => {
        const nextPage = readPositiveNumber(searchParams.get("page"), 1)
        const nextLimit = readPositiveNumber(searchParams.get("limit"), 10)
        const nextSort = readSortValue(searchParams.get("sort"))
        const nextStatus = readStatusValue(searchParams.get("status"))
        const nextDeskId = readDeskIdValue(searchParams.get("desk_id"))
        const nextDateFrom = searchParams.get("date_from") ?? ""
        const nextDateTo = searchParams.get("date_to") ?? ""
        const nextTimeFilter = readTimeFilterValue(searchParams.get("time_filter"), nextDateFrom, nextDateTo)

        setPage(currentPage => currentPage === nextPage ? currentPage : nextPage)
        setLimit(currentLimit => currentLimit === nextLimit ? currentLimit : nextLimit)
        setSort(currentSort => currentSort === nextSort ? currentSort : nextSort)
        setStatus(currentStatus => currentStatus === nextStatus ? currentStatus : nextStatus)
        setDeskId(currentDeskId => currentDeskId === nextDeskId ? currentDeskId : nextDeskId)
        setDateFrom(currentDateFrom => currentDateFrom === nextDateFrom ? currentDateFrom : nextDateFrom)
        setDateTo(currentDateTo => currentDateTo === nextDateTo ? currentDateTo : nextDateTo)
        setTimeFilter(currentTimeFilter => currentTimeFilter === nextTimeFilter ? currentTimeFilter : nextTimeFilter)
    }, [searchParams])

    const updateSearchParams = (updates: Record<string, string | null>) => {
        const nextParams = new URLSearchParams(searchParams)

        Object.entries(updates).forEach(([key, value]) => {
            if (!value) {
                nextParams.delete(key)
                return
            }

            nextParams.set(key, value)
        })

        setSearchParams(nextParams)
    }

    const handlePageChange = (nextPage: number) => {
        if (nextPage === page || nextPage < 1 || nextPage > Math.ceil(total / limit)) {
            return
        }
        setPage(nextPage)
        updateSearchParams({ page: String(nextPage), limit: String(limit) })
    }

    const handleLimitChange = (nextLimit: number) => {
        setPage(1)
        setLimit(nextLimit)
        updateSearchParams({ page: "1", limit: String(nextLimit) })
    }

    const handleSortChange = (nextSort: ReservationSortValue) => {
        setPage(1)
        setSort(nextSort)
        updateSearchParams({ sort: nextSort, page: "1" })
    }

    const handleStatusChange = (nextStatus: ReservationStatusFilterValue) => {
        setPage(1)
        setStatus(nextStatus)
        updateSearchParams({ status: nextStatus === "ALL" ? null : nextStatus, page: "1" })
    }

    const handleDeskChange = (nextDeskId: string) => {
        setPage(1)
        setDeskId(nextDeskId)
        updateSearchParams({ desk_id: nextDeskId === "ALL" ? null : nextDeskId, page: "1" })
    }

    const handleTimeFilterChange = (nextTimeFilter: ReservationTimeFilterValue) => {
        setPage(1)
        setTimeFilter(nextTimeFilter)

        if (nextTimeFilter === "all") {
            setDateFrom("")
            setDateTo("")
            updateSearchParams({
                time_filter: nextTimeFilter,
                date_from: null,
                date_to: null,
                page: "1",
            })
            return
        }

        if (nextTimeFilter === "custom") {
            updateSearchParams({
                time_filter: nextTimeFilter,
                page: "1",
            })
            return
        }

        const presetRange = getPresetRange(nextTimeFilter)
        if (!presetRange) {
            return
        }

        setDateFrom(presetRange.dateFrom)
        setDateTo(presetRange.dateTo)
        updateSearchParams({
            time_filter: nextTimeFilter,
            date_from: presetRange.dateFrom,
            date_to: presetRange.dateTo,
            page: "1",
        })
    }

    const handleDateFromChange = (nextDateFrom: string) => {
        setPage(1)
        setTimeFilter("custom")
        setDateFrom(nextDateFrom)
        updateSearchParams({ time_filter: "custom", date_from: nextDateFrom || null, page: "1" })
    }

    const handleDateToChange = (nextDateTo: string) => {
        setPage(1)
        setTimeFilter("custom")
        setDateTo(nextDateTo)
        updateSearchParams({ time_filter: "custom", date_to: nextDateTo || null, page: "1" })
    }

    const handleClearFilters = () => {
        setPage(1)
        setSort("start_time_desc")
        setStatus("ALL")
        setDeskId("ALL")
        setTimeFilter("all")
        setDateFrom("")
        setDateTo("")
        updateSearchParams({
            sort: null,
            status: null,
            desk_id: null,
            time_filter: null,
            date_from: null,
            date_to: null,
            page: "1",
        })
    }

    useEffect(() => {
        if (!activeOpenSpace?.id) {
            return
        }

        setIsLoading(true)
        const requestParams = new URLSearchParams({
            limit: String(limit),
            page: String(page),
            sort,
        })

        if (status !== "ALL") {
            requestParams.set("status", status)
        }

        if (deskId !== "ALL") {
            requestParams.set("desk_id", deskId)
        }

        if (dateFrom) {
            requestParams.set("date_from", dateFrom)
        }

        if (dateTo) {
            requestParams.set("date_to", dateTo)
        }

        fetch(`/api/dashboard/open-spaces/${activeOpenSpace?.id}/reservations?${requestParams.toString()}`, {
            credentials: "include",
            headers: { "Authorization": "Bearer " + localStorage.getItem("accessToken") },
        })
            .then(res => {
                if (!res.ok) {
                    throw new Error("Failed to load all reservations")
                }
                return res.json()
            })
            .then((data: ReservationsResponse) => {
                setReservations(data.items)
                setTotal(data.total)
                setPage(data.page)
                setLimit(data.limit)
            })
            .catch(err => setError(err.message))
            .finally(() => setIsLoading(false))
    }, [activeOpenSpace?.id, page, limit, sort, status, deskId, dateFrom, dateTo])

    return (
        <div className="flex flex-col h-full w-full p-4 md:p-6 lg:p-8">
            <h1 className="text-2xl font-bold mb-6">All Reservations</h1>
            <div className="self-stretch pt-8">
                {error && (
                    <p className="pb-8 text-sm text-center font-medium text-destructive">
                        {error}
                    </p>
                )}
                {isLoading ? (
                    <p className="text-sm text-center font-medium text-muted-foreground">
                        Loading all reservations...
                    </p>
                ) : (
                    <div>
                        <ReservationsFilters
                            sort={sort}
                            status={status}
                            deskId={deskId}
                            deskOptions={deskOptions}
                            timeFilter={timeFilter}
                            dateFrom={dateFrom}
                            dateTo={dateTo}
                            onSortChange={handleSortChange}
                            onStatusChange={handleStatusChange}
                            onDeskChange={handleDeskChange}
                            onTimeFilterChange={handleTimeFilterChange}
                            onDateFromChange={handleDateFromChange}
                            onDateToChange={handleDateToChange}
                            onClearFilters={handleClearFilters}
                        />
                        <ListPagination className="mb-4" total={total} page={page} limit={limit} onPageChange={handlePageChange} onLimitChange={handleLimitChange} />
                        <ReservationsList reservations={reservations} />
                        <ListPagination total={total} page={page} limit={limit} onPageChange={handlePageChange} onLimitChange={handleLimitChange} />
                    </div>
                )}
            </div>
        </div>
    )
}
