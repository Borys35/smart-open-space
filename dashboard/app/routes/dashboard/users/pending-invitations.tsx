import { use, useEffect, useState } from "react";
import { CreateOpenSpaceForm } from "~/components/forms/create-open-space-form";
import { InviteUserForm } from "~/components/forms/invite-user-form";
import type { Invitation } from "~/components/lists/invitations-list";
import InvitationsList from "~/components/lists/invitations-list";
import { Button } from "~/components/ui/button"
import { useOpenSpace } from "~/providers/OpenSpaceProvider";

export const handle = {
    title: "Pending Invitations",
};

export default function UsersPendingInvitations() {
    const [pendingInvitations, setPendingInvitations] = useState<Invitation[]>([])
    const [error, setError] = useState<string | null>(null)
    const [isLoading, setIsLoading] = useState(true)
    const { activeOpenSpace } = useOpenSpace()

    useEffect(() => {
        setIsLoading(true)
        fetch(`/api/dashboard/open-spaces/${activeOpenSpace?.id}/invites?pending_only=true`, {
            credentials: "include",
            headers: { "Authorization": "Bearer " + localStorage.getItem("accessToken") },
        })
            .then(res => {
                if (!res.ok) {
                    throw new Error("Failed to load pending invitations")
                }
                return res.json()
            })
            .then(data => setPendingInvitations(data))
            .catch(err => setError(err.message))
            .finally(() => setIsLoading(false))
    }, [activeOpenSpace?.id])


    return (
        <div className="flex flex-col h-full w-full p-4 md:p-6 lg:p-8">
            <h1 className="text-2xl font-bold mb-6">Pending Invitations</h1>
            <div className="self-stretch pt-8">
                {error && (
                    <p className="pb-8 text-sm text-center font-medium text-destructive">
                        {error}
                    </p>
                )}
                <InvitationsList invitations={pendingInvitations} />
            </div>
        </div>
    )
}
