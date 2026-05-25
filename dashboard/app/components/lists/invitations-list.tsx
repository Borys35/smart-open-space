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

export interface Invitation {
  id: number;
  email: string;
  status: "PENDING" | "ACCEPTED" | "REJECTED";
  invited_user: {
    id: number;
    username: string;
    email: string;
  } | null;
  created_at: string;
}

interface InvitationsListProps {
  invitations: Invitation[]
}

export default function InvitationsList({ invitations }: InvitationsListProps) {
  if (invitations.length === 0) {
    return (
      <div className="text-center">
        <p className="text-sm text-muted-foreground">No pending invitations.</p>
        <Button variant="outline" size="sm" className="mt-4">
          <Link to="/users/invite">Invite a User</Link>
        </Button>
      </div>
    )
  }
  return (
    <Table>
      <TableCaption>Pending Invitations</TableCaption>
      <TableHeader>
        <TableRow>
          <TableHead>Email</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Invited User</TableHead>
          <TableHead>Created At</TableHead>
          <TableHead>Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {invitations.map((invite) => (
          <TableRow key={invite.id}>
            <TableCell>{invite.email}</TableCell>
            <TableCell><Badge variant="default">
              {invite.status}
            </Badge></TableCell>
            <TableCell>
              {invite.invited_user ? invite.invited_user.username : "N/A"}
            </TableCell>
            <TableCell>{new Date(invite.created_at).toLocaleDateString()}</TableCell>
            <TableCell>
              <Button variant="destructive" size="sm">
                Cancel
              </Button>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}
