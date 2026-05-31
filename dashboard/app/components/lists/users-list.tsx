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

export interface UserListItem {
    id: number;
    username: string;
    email: string;
    role: "MANAGER" | "USER";
    membership_status: string;
    credits_balance: number;
}

interface UsersListProps {
    users: UserListItem[];
    onPromote?: (userId: number) => void;
}

export default function UsersList({ users, onPromote }: UsersListProps) {
    if (users.length === 0) {
        return (
            <div className="text-center">
                <p className="text-sm text-muted-foreground">No users yet. Invite someone to join!</p>
                <Button variant="outline" size="sm" className="mt-4">
                    <Link to="/users/invite">Invite a User</Link>
                </Button>
            </div>
        )
    }

    return (
        <Table>
            <TableCaption>Users</TableCaption>
            <TableHeader>
                <TableRow>
                    <TableHead>Email</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Credits</TableHead>
                    <TableHead>Actions</TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                {users.map((user) => (
                    <TableRow key={user.id}>
                        <TableCell>{user.email}</TableCell>
                        <TableCell><Badge variant="default">
                            {user.role === "MANAGER" ? "Manager" : "User"}
                        </Badge></TableCell>
                        <TableCell>
                            <p>{user.membership_status}</p>
                        </TableCell>
                        <TableCell>{user.credits_balance}</TableCell>
                        <TableCell>
                            <Button variant="destructive" size="sm" onClick={() => onPromote && onPromote(user.id)}>
                                Promote
                            </Button>
                        </TableCell>
                    </TableRow>
                ))}
            </TableBody>
        </Table>
    )
}
