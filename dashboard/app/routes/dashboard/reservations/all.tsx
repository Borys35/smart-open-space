import { use, useEffect, useState } from "react";
import { CreateOpenSpaceForm } from "~/components/forms/create-open-space-form";
import { InviteUserForm } from "~/components/forms/invite-user-form";
import type { Invitation } from "~/components/lists/invitations-list";
import InvitationsList from "~/components/lists/invitations-list";
import { Button } from "~/components/ui/button"
import { useOpenSpace } from "~/providers/OpenSpaceProvider";
import UsersList, { type UserListItem } from "~/components/lists/users-list";
import ReservationsList, { type ReservationListItem } from "~/components/lists/reservations-list";
import { Field, FieldLabel } from "@/components/ui/field"
import {
    Pagination,
    PaginationContent,
    PaginationItem,
    PaginationNext,
    PaginationPrevious,
} from "@/components/ui/pagination"
import {
    Select,
    SelectContent,
    SelectGroup,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
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


export default function Reservations() {
    const [reservations, setReservations] = useState<ReservationListItem[]>([])
    const [page, setPage] = useState(1)
    const [total, setTotal] = useState(0)
    const [limit, setLimit] = useState(10)
    const [error, setError] = useState<string | null>(null)
    const [isLoading, setIsLoading] = useState(true)
    const { activeOpenSpace } = useOpenSpace()

    useEffect(() => {
        setIsLoading(true)
        fetch(`/api/dashboard/open-spaces/${activeOpenSpace?.id}/reservations?limit=10`, {
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
    }, [activeOpenSpace?.id])

    const handlePromoteUser = async (userId: number) => {
        try {
            const response = await fetch(`/api/dashboard/open-spaces/${activeOpenSpace?.id}/users/${userId}/promote`, {
                method: "POST",
                credentials: "include",
                headers: { "Authorization": "Bearer " + localStorage.getItem("accessToken") },
            })

            if (!response.ok) {
                const result = await response.json()
                throw new Error(result.detail || "Failed to promote user")
            }

            setReservations(prev => prev.map(reservation => reservation.id === userId ? { ...reservation, role: "MANAGER" } : reservation))
        } catch (err: any) {
            setError(err.message)
        }
    }

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

                        <ReservationsList reservations={reservations} />
                        <ListPagination total={total} page={page} limit={limit} onPageChange={(newPage) => setPage(newPage)} />
                    </div>
                )}
            </div>
        </div>
    )
}
