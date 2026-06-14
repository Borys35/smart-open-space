import { useState } from "react"
import { Controller, useForm } from "react-hook-form"
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
import { Checkbox } from "~/components/ui/checkbox"

const deviceSchema = z.object({
    name: z.string().min(1, "Device name is required"),
    device_key: z.string().min(1, "Device key is required"),
    is_active: z.boolean()
})

type deviceFormValues = z.infer<typeof deviceSchema>

interface UpdateDeviceFormProps extends React.ComponentProps<"div"> {
    accessDevice: Device
    onFormSubmit?: (device: Device) => void
}

export function UpdateDeviceForm({
    className,
    accessDevice,
    onFormSubmit,
    ...props
}: UpdateDeviceFormProps) {
    const [serverError, setServerError] = useState<string | null>(null)

    const {
        register,
        handleSubmit,
        formState: { errors, isSubmitting },
        control,
        reset,
    } = useForm<deviceFormValues>({
        resolver: zodResolver(deviceSchema),
        defaultValues: {
            name: accessDevice.name,
            device_key: accessDevice.device_key,
            is_active: accessDevice.is_active,
        },
    })

    const onSubmit = async (data: deviceFormValues) => {
        setServerError(null)
        try {
            const response = await fetch(`/api/dashboard/access-devices/${accessDevice.id}`, {
                method: "PATCH",
                credentials: "include",
                headers: { "Content-Type": "application/json", "Authorization": "Bearer " + localStorage.getItem("accessToken") },
                body: JSON.stringify({ ...data }),
            })

            const result = await response.json()

            if (!response.ok) {
                throw new Error(result.detail || "Something went wrong")
            }

            console.log("Device updated:", result)
            onFormSubmit?.(result)
        } catch (error: any) {
            setServerError(error.message)
        }
    }

    return (
        <div className={cn("flex flex-col gap-6", className)} {...props}>
            <Card>
                <CardHeader>
                    <CardTitle>Update Device</CardTitle>
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
                            <Field orientation="horizontal">
                                <Controller
                                    control={control}
                                    name="is_active"
                                    render={({ field: { onChange, value } }) => (
                                        <Checkbox
                                            id="is_active"
                                            checked={value}
                                            onCheckedChange={onChange}
                                            disabled={isSubmitting}
                                        />
                                    )}
                                />
                                <FieldLabel htmlFor="is_active">Is Active?</FieldLabel>
                                {errors.is_active && (
                                    <p className="text-sm font-medium text-destructive">{errors.is_active.message}</p>
                                )}
                            </Field>

                            {serverError && (
                                <p className="text-sm text-center font-medium text-destructive">
                                    {serverError}
                                </p>
                            )}

                            <Field>
                                <Button type="submit" disabled={isSubmitting}>
                                    Update Device
                                </Button>
                            </Field>
                        </FieldGroup>
                    </form>
                </CardContent>
            </Card>
        </div>
    )
}
