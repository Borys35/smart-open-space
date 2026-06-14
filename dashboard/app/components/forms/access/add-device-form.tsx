import { useState } from "react"
import { useForm } from "react-hook-form"
import { useNavigate } from "react-router"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card"
import {
    Field,
    FieldDescription,
    FieldGroup,
    FieldLabel,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { useOpenSpace } from "~/providers/OpenSpaceProvider"
import type { Device } from "~/routes/dashboard/access/current-device"

const deviceSchema = z.object({
    name: z.string().min(1, "Device name is required"),
    device_key: z.string().min(1, "Device key is required"),
})

type deviceFormValues = z.infer<typeof deviceSchema>

interface AddDeviceFormProps extends React.ComponentProps<"div"> {
    onFormSubmit?: (device: Device) => void
}

export function AddDeviceForm({
    className,
    onFormSubmit,
    ...props
}: AddDeviceFormProps) {
    const [serverError, setServerError] = useState<string | null>(null)
    const navigate = useNavigate()
    const { activeOpenSpace } = useOpenSpace()

    const {
        register,
        handleSubmit,
        formState: { errors, isSubmitting },
        reset,
    } = useForm<deviceFormValues>({
        resolver: zodResolver(deviceSchema),
        defaultValues: {
            name: "",
            device_key: "",
        },
    })

    const onSubmit = async (data: deviceFormValues) => {
        setServerError(null)
        try {
            const openSpaceId = activeOpenSpace?.id
            if (!openSpaceId) {
                throw new Error("No active open space selected")
            }
            const response = await fetch(`/api/dashboard/access-devices`, {
                method: "POST",
                credentials: "include",
                headers: { "Content-Type": "application/json", "Authorization": "Bearer " + localStorage.getItem("accessToken") },
                body: JSON.stringify({ ...data, open_space_id: openSpaceId }),
            })

            const result = await response.json()

            if (!response.ok) {
                throw new Error(result.detail || "Something went wrong")
            }

            console.log("Device created:", result)
            onFormSubmit?.(result)
            reset()
        } catch (error: any) {
            setServerError(error.message)
        }
    }

    return (
        <div className={cn("flex flex-col gap-6", className)} {...props}>
            <Card>
                <CardHeader>
                    <CardTitle>Add Device</CardTitle>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSubmit(onSubmit)}>
                        <FieldGroup>
                            <Field>
                                <FieldLabel htmlFor="name">Device Name</FieldLabel>
                                <Input
                                    {...register("name")}
                                    id="name"
                                    type="text"
                                    required
                                    disabled={isSubmitting}
                                />
                                {errors.name && (
                                    <p className="text-sm font-medium text-destructive">{errors.name.message}</p>
                                )}
                            </Field>
                            <Field>
                                <FieldLabel htmlFor="device_key">Device Key</FieldLabel>
                                <FieldDescription>Enter the exact key from the device.</FieldDescription>
                                <Input
                                    {...register("device_key")}
                                    id="device_key"
                                    type="text"
                                    placeholder="e.g., ABC123XYZ"
                                    required
                                    disabled={isSubmitting}
                                />
                                {errors.device_key && (
                                    <p className="text-sm font-medium text-destructive">{errors.device_key.message}</p>
                                )}
                            </Field>

                            {serverError && (
                                <p className="text-sm text-center font-medium text-destructive">
                                    {serverError}
                                </p>
                            )}

                            <Field>
                                <Button type="submit" disabled={isSubmitting}>
                                    Add Device
                                </Button>
                            </Field>
                        </FieldGroup>
                    </form>
                </CardContent>
            </Card>
        </div>
    )
}
