import { useEffect, useState } from "react";
import { useSearchParams } from "react-router";
import { useOpenSpace } from "~/providers/OpenSpaceProvider";
import ReservationsList, { type ReservationListItem } from "~/components/lists/reservations-list";
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


export const SORT_VALUES = { "start_time_desc": "Start time (desc)", "start_time_asc": "Start time (asc)" }
export const STATUS_FILTER_VALUES = { "PENDING": "Pending", "CONFIRMED": "Confirmed", "CANCELLED": "Cancelled", "DONE": "Done" }

function readPositiveNumber(value: string | null, fallback: number) {
    const parsedValue = Number(value)

    return Number.isInteger(parsedValue) && parsedValue > 0 ? parsedValue : fallback
}


export default function Reservations() {
    const [searchParams, setSearchParams] = useSearchParams()
    const [reservations, setReservations] = useState<ReservationListItem[]>([])
    const [page, setPage] = useState(() => readPositiveNumber(searchParams.get("page"), 1))
    const [total, setTotal] = useState(0)
    const [limit, setLimit] = useState(() => readPositiveNumber(searchParams.get("limit"), 10))
    const [error, setError] = useState<string | null>(null)
    const [isLoading, setIsLoading] = useState(true)
    const { activeOpenSpace } = useOpenSpace()

    useEffect(() => {
        const nextPage = readPositiveNumber(searchParams.get("page"), 1)
        const nextLimit = readPositiveNumber(searchParams.get("limit"), 10)

        setPage(currentPage => currentPage === nextPage ? currentPage : nextPage)
        setLimit(currentLimit => currentLimit === nextLimit ? currentLimit : nextLimit)
    }, [searchParams])

    const updateSearchParams = (nextPage: number, nextLimit: number) => {
        const nextParams = new URLSearchParams(searchParams)

        nextParams.set("page", String(nextPage))
        nextParams.set("limit", String(nextLimit))

        setSearchParams(nextParams)
    }

    const handlePageChange = (nextPage: number) => {
        if (nextPage === page || nextPage < 1 || nextPage > Math.ceil(total / limit)) {
            return
        }
        setPage(nextPage)
        updateSearchParams(nextPage, limit)
    }

    const handleLimitChange = (nextLimit: number) => {
        setPage(1)
        setLimit(nextLimit)
        updateSearchParams(1, nextLimit)
    }

    useEffect(() => {
        if (!activeOpenSpace?.id) {
            return
        }

        setIsLoading(true)
        fetch(`/api/dashboard/open-spaces/${activeOpenSpace?.id}/reservations?limit=${limit}&page=${page}`, {
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
    }, [activeOpenSpace?.id, page, limit])

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
                        <ListPagination className="mb-4" total={total} page={page} limit={limit} onPageChange={handlePageChange} onLimitChange={handleLimitChange} />
                        <ReservationsList reservations={reservations} />
                    </div>
                )}
            </div>
        </div>
    )
}
