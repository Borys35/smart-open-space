import React from 'react'
import {
    Table,
    TableBody,
    TableCaption,
    TableCell,
    TableFooter,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Link } from 'react-router';

enum ReservationStatus {
    "PENDING", "CONFIRMED", "CANCELLED", "DONE"
}

export interface ReservationListItem {
    id: number;
    desk_id: number;
    desk_label: string;
    user_id: number;
    username: string;
    email: string;
    start_time: string;
    end_time: string;
    status: ReservationStatus;
    credit_cost: number;
}

interface ReservationsListProps {
    reservations: ReservationListItem[];
    onCancel?: (reservationId: number) => void;
}

export default function ReservationsList({ reservations, onCancel }: ReservationsListProps) {
    if (reservations.length === 0) {
        return (
            <div className="text-center">
                <p className="text-sm text-muted-foreground">No reservations.</p>
                <Button variant="outline" size="sm" className="mt-4">
                    <Link to="/users/invite">Invite a User</Link>
                </Button>
            </div>
        )
    }

    return (
        <Table>
            <TableCaption>Reservations</TableCaption>
            <TableHeader>
                <TableRow>
                    <TableHead>ID</TableHead>
                    <TableHead>Desk</TableHead>
                    <TableHead>User</TableHead>
                    <TableHead>Start Time</TableHead>
                    <TableHead>End Time</TableHead>
                    <TableHead>Credit Cost</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                {reservations.map((reservation) => (
                    <TableRow key={reservation.id}>
                        <TableCell>{reservation.id}</TableCell>
                        <TableCell>{reservation.desk_label}</TableCell>
                        <TableCell>
                            {reservation.user_id ? reservation.username : "N/A"}
                        </TableCell>
                        <TableCell>{new Date(reservation.start_time).toLocaleDateString(navigator.language, { hour: '2-digit', minute: '2-digit' })}</TableCell>
                        <TableCell>{new Date(reservation.end_time).toLocaleDateString(navigator.language, { hour: '2-digit', minute: '2-digit' })}</TableCell>
                        <TableCell>{reservation.credit_cost}</TableCell>
                        <TableCell>
                            <Badge variant="default">
                                {reservation.status}
                            </Badge>
                        </TableCell>
                        <TableCell>
                            <Button variant="destructive" size="sm" onClick={() => onCancel && onCancel(reservation.id)}>
                                Cancel
                            </Button>
                        </TableCell>
                    </TableRow>
                ))}
            </TableBody>
        </Table>
    )
}
