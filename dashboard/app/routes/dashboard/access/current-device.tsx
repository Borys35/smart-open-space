import { use, useEffect, useState } from "react";
import { CreateOpenSpaceForm } from "~/components/forms/create-open-space-form";
import { InviteUserForm } from "~/components/forms/invite-user-form";
import type { Invitation } from "~/components/lists/invitations-list";
import InvitationsList from "~/components/lists/invitations-list";
import { Button } from "~/components/ui/button"
import { useOpenSpace } from "~/providers/OpenSpaceProvider";
import UsersList, { type UserListItem } from "~/components/lists/users-list";
import AddDevice from "./add-device";
import { AddDeviceForm } from "~/components/forms/access/add-device-form";
import { UpdateDeviceForm } from "~/components/forms/access/update-device-form";

export const handle = {
    title: "Current Device",
};

export interface Device {
    id: number
    open_space_id: number
    name: string
    device_key: string
    is_active: boolean
    created_at: string
    updated_at: string
}

export default function CurrentDevice() {
    const [users, setUsers] = useState<UserListItem[]>([])
    const [accessDevice, setAccessDevice] = useState<Device | null>(null)
    const [error, setError] = useState<string | null>(null)
    const [isLoading, setIsLoading] = useState(true)
    const { activeOpenSpace } = useOpenSpace()

    function handleDeviceCreated(device: Device) {
        setAccessDevice(device)
    }

    useEffect(() => {
        setIsLoading(true)
        fetch(`/api/dashboard/open-spaces/${activeOpenSpace?.id}/access-devices`, {
            credentials: "include",
            headers: { "Authorization": "Bearer " + localStorage.getItem("accessToken") },
        })
            .then(res => {
                if (!res.ok) {
                    throw new Error("Failed to load access device")
                }
                return res.json()
            })
            .then(data => {
                if (data.length <= 0) return

                setAccessDevice(data[0])
            })
            .catch(err => setError(err.message))
            .finally(() => setIsLoading(false))
    }, [activeOpenSpace?.id])

    return (
        <div className="flex flex-col h-full w-full p-4 md:p-6 lg:p-8">
            <h1 className="text-2xl font-bold mb-6">Manage Access Device</h1>
            <div className="self-stretch pt-8">
                {error && (
                    <p className="pb-8 text-sm text-center font-medium text-destructive">
                        {error}
                    </p>
                )}
                {isLoading ? (
                    <p className="text-sm text-center font-medium text-muted-foreground">
                        Loading device information...
                    </p>
                ) : (
                    accessDevice ? (
                        <div>
                            <p><strong>Device Name:</strong> {accessDevice.name}</p>
                            <p><strong>Device Key:</strong> {accessDevice.device_key}</p>
                            <p><strong>Status:</strong> {accessDevice.is_active ? "Active" : "Inactive"}</p>
                            <div className="mx-auto w-full lg:w-lg self-center pt-8">
                                <UpdateDeviceForm accessDevice={accessDevice} onFormSubmit={handleDeviceCreated} />
                            </div>
                        </div>
                    ) : (
                        <div className="mx-auto w-full lg:w-lg self-center pt-8">
                            <AddDeviceForm onFormSubmit={handleDeviceCreated} />
                        </div>
                    ))
                }
            </div>
        </div>
    )
}
