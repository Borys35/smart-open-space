import { use, useEffect, useState } from "react";
import { CreateOpenSpaceForm } from "~/components/forms/create-open-space-form";
import { InviteUserForm } from "~/components/forms/invite-user-form";
import type { Invitation } from "~/components/lists/invitations-list";
import InvitationsList from "~/components/lists/invitations-list";
import { Button } from "~/components/ui/button"
import { useOpenSpace } from "~/providers/OpenSpaceProvider";
import UsersList, { type UserListItem } from "~/components/lists/users-list";
import ReservationsList, { type ReservationListItem } from "~/components/lists/reservations-list";

export const handle = {
    title: "Reservations",
};

interface ReservationsResponse {
    items: ReservationListItem[];
    total: number;
    page: number;
    limit: number;
}

export default function Reservations() {
    const [reservations, setReservations] = useState<ReservationListItem[]>([])
    const [error, setError] = useState<string | null>(null)
    const [isLoading, setIsLoading] = useState(true)
    const { activeOpenSpace } = useOpenSpace()

    useEffect(() => {
        setIsLoading(true)
        fetch(`/api/dashboard/open-spaces/${activeOpenSpace?.id}/reservations`, {
            credentials: "include",
            headers: { "Authorization": "Bearer " + localStorage.getItem("accessToken") },
        })
            .then(res => {
                if (!res.ok) {
                    throw new Error("Failed to load all reservations")
                }
                return res.json()
            })
            .then((data: ReservationsResponse) => { setReservations(data.items) })
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
                    <ReservationsList reservations={reservations} />
                )}
            </div>
        </div>
    )
}
