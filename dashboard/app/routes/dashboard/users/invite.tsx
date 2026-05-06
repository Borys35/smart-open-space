import { CreateOpenSpaceForm } from "~/components/forms/create-open-space-form";
import { InviteUserForm } from "~/components/forms/invite-user-form";
import { Button } from "~/components/ui/button"

export const handle = {
    title: "Invite User",
};

export default function UsersInvite() {
    return (
        <div className="flex flex-col h-full w-full p-4 md:p-6 lg:p-8">
            <h1 className="text-2xl font-bold mb-6">Invite User</h1>
            <div className="w-lg self-center pt-8">
                <InviteUserForm openSpaceId="undefined" />
            </div>
        </div>
    )
}
