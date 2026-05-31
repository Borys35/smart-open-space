import { useEffect, useState } from "react";
import { useParams } from "react-router";
import { useOpenSpace } from "~/providers/OpenSpaceProvider";

export const handle = {
    title: "Reservation details",
};

interface ReservationDetails {
    id: number;
    desk_id: number;
    desk_label: string;
    user_id: number;
    username: string;
    email: string;
    start_time: string;
    end_time: string;
    credit_cost: number;
    status: "PENDING" | "CONFIRMED" | "CANCELLED" | "DONE";
    checked_in_at: string | null;
    checked_out_at: string | null;
    created_at: string;
}


export default function ReservationDetails() {

    const [reservation, setReservation] = useState<ReservationDetails | null>(null)
    const [error, setError] = useState<string | null>(null)
    const [isLoading, setIsLoading] = useState(true)
    const { activeOpenSpace } = useOpenSpace()
    const { id } = useParams<{ id: string }>()
    const reservationId = parseInt(id!, 10)

    useEffect(() => {
        if (!activeOpenSpace?.id) {
            return
        }

        fetch(`/api/dashboard/open-spaces/${activeOpenSpace.id}/reservations/${reservationId}`, {
            credentials: "include",
            headers: { "Authorization": "Bearer " + localStorage.getItem("accessToken") },
        })
            .then((response) => {
                if (!response.ok) {
                    throw new Error("Failed to load the reservation details")
                }

                return response.json()
            })
            .then((data: ReservationDetails) => {
                setReservation(data)
            })
            .catch(() => {
                setReservation(null)
            })
    }, [activeOpenSpace?.id, reservationId])

    return (
        <div className="flex flex-col h-full w-full p-4 md:p-6 lg:p-8">
            <h1 className="text-2xl font-bold mb-6">Reservation Details</h1>
            <div className="self-stretch pt-8">
                {reservation && (
                    <div>
                        <p><strong>Desk ID:</strong> {reservation.desk_id}</p>
                        <p><strong>Username:</strong> {reservation.username}</p>
                        <p><strong>Email:</strong> {reservation.email}</p>
                        <p><strong>Start Time:</strong> {reservation.start_time}</p>
                        <p><strong>End Time:</strong> {reservation.end_time}</p>
                        <p><strong>Credit Cost:</strong> {reservation.credit_cost}</p>
                        <p><strong>Status:</strong> {reservation.status}</p>
                    </div>
                )}
            </div>
        </div>
    )
}
