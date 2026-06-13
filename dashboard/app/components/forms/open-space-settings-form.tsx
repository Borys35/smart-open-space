import { useEffect, useState } from "react"
import { Controller, useForm } from "react-hook-form"
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
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "../ui/select"


const openSpaceSchema = z.object({
    name: z.string().trim().min(1, "Name is required").max(100, "Name must be at most 100 characters long"),
    building: z.string().trim().min(1, "Building is required").max(50, "Building must be at most 50 characters long"),
    floor: z.coerce.number({ invalid_type_error: "Floor must be a number" }).int("Floor must be an integer").min(0, "Floor cannot be negative"),
    address: z.string().trim().max(255, "Address must be at most 255 characters long").optional().or(z.literal("")),
    place_name: z.string().trim().max(255, "Place name must be at most 255 characters long").optional().or(z.literal("")),
    latitude: z.preprocess((value) => value === "" || value === null || value === undefined ? null : value, z.coerce.number().min(-90, "Latitude must be between -90 and 90").max(90, "Latitude must be between -90 and 90").nullable()),
    longitude: z.preprocess((value) => value === "" || value === null || value === undefined ? null : value, z.coerce.number().min(-180, "Longitude must be between -180 and 180").max(180, "Longitude must be between -180 and 180").nullable()),
    image_url: z.string().trim().url("Image URL must be a valid URL").optional().or(z.literal("")),
    opened_at: z.string().trim().optional().or(z.literal("")),
    closed_at: z.string().trim().optional().or(z.literal("")),
    credits_per_hour: z.coerce.number({ invalid_type_error: "Credits per hour must be a number" }).min(1, "Credits per hour must be greater than 0"),
    max_daily_hours: z.coerce.number({ invalid_type_error: "Max daily hours must be a number" }).min(1, "Max daily hours must be greater than 0"),
    period_credits: z.coerce.number({ invalid_type_error: "Period credits must be a number" }),
    credit_reset_period: z.string().min(1, "Credit reset period is required").transform((value) => value.trim().toUpperCase()).refine((value) => ["WEEKLY", "MONTHLY"].includes(value), "Credit reset period must be WEEKLY or MONTHLY"),
    late_checkout_penalty_hours: z.coerce.number({ invalid_type_error: "Late checkout penalty hours must be a number" }).min(0, "Late checkout penalty hours cannot be negative"),
    no_show_penalty_hours: z.coerce.number({ invalid_type_error: "No show penalty hours must be a number" }).min(0, "No show penalty hours cannot be negative"),
})

type OpenSpaceFormInput = z.input<typeof openSpaceSchema>
type OpenSpaceFormValues = z.output<typeof openSpaceSchema>

export function OpenSpaceSettingsForm({
    className,
    ...props
}: React.ComponentProps<"div">) {
    const [serverError, setServerError] = useState<string | null>(null)
    const { reloadOpenSpaces, activeOpenSpace } = useOpenSpace()
    const currentOpenSpace = activeOpenSpace
    const {
        register,
        handleSubmit,
        reset,
        formState: { errors, isSubmitting },
        control
    } = useForm<OpenSpaceFormInput, undefined, OpenSpaceFormValues>({
        resolver: zodResolver(openSpaceSchema),
        defaultValues: {
            name: "",
            building: "",
            floor: 0,
            address: "",
            place_name: "",
            latitude: null,
            longitude: null,
            image_url: "",
            opened_at: "",
            closed_at: "",
            credits_per_hour: 0,
            max_daily_hours: 0,
            period_credits: 0,
            credit_reset_period: "WEEKLY",
            late_checkout_penalty_hours: 0,
            no_show_penalty_hours: 0,
        },
    })

    useEffect(() => {
        if (!currentOpenSpace) {
            return
        }

        reset({
            name: currentOpenSpace.name ?? "",
            building: currentOpenSpace.building ?? "",
            floor: currentOpenSpace.floor ?? 0,
            address: currentOpenSpace.address ?? "",
            place_name: currentOpenSpace.place_name ?? "",
            latitude: currentOpenSpace.latitude ?? null,
            longitude: currentOpenSpace.longitude ?? null,
            image_url: currentOpenSpace.image_url ?? "",
            opened_at: currentOpenSpace.opened_at ? new Date(currentOpenSpace.opened_at).toISOString().slice(0, 16) : "",
            closed_at: currentOpenSpace.closed_at ? new Date(currentOpenSpace.closed_at).toISOString().slice(0, 16) : "",
            credits_per_hour: currentOpenSpace.credits_per_hour ?? 0,
            max_daily_hours: currentOpenSpace.max_daily_hours ?? 0,
            period_credits: currentOpenSpace.period_credits ?? 0,
            credit_reset_period: currentOpenSpace.credit_reset_period ?? "WEEKLY",
            late_checkout_penalty_hours: currentOpenSpace.late_checkout_penalty_hours ?? 0,
            no_show_penalty_hours: currentOpenSpace.no_show_penalty_hours ?? 0,
        })
    }, [currentOpenSpace, reset])

    const onSubmit = async (data: OpenSpaceFormValues) => {
        setServerError(null)
        try {
            const response = await fetch(`/api/dashboard/open-spaces/${currentOpenSpace?.id}/settings`, {
                method: "PATCH",
                credentials: "include",
                headers: { "Content-Type": "application/json", "Authorization": "Bearer " + localStorage.getItem("accessToken") },
                body: JSON.stringify(data),
            })

            const result = await response.json()

            if (!response.ok) {
                throw new Error(result.detail || "Something went wrong")
            }

            await reloadOpenSpaces()
        } catch (error: any) {
            setServerError(error.detail[0].msg)
        }
    }

    return (
        <div className={cn("flex flex-col gap-6", className)} {...props}>
            <Card>
                <CardHeader>
                    <CardTitle>Update Open Space Settings</CardTitle>
                    <CardDescription>
                        Update the settings for your open space.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSubmit(onSubmit)}>
                        <FieldGroup>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

                                <Field>
                                    <FieldLabel htmlFor="name">Open Space Name</FieldLabel>
                                    <Input
                                        {...register("name")}
                                        id="name"
                                        type="text"
                                        placeholder="e.g., Warsaw HQ"
                                        required
                                        disabled={isSubmitting}
                                    />
                                    {errors.name && (
                                        <p className="text-sm font-medium text-destructive">{errors.name.message}</p>
                                    )}
                                </Field>

                                <Field>
                                    <FieldLabel htmlFor="building">Building</FieldLabel>
                                    <Input
                                        {...register("building")}
                                        id="building"
                                        type="text"
                                        placeholder="e.g., Building A"
                                        required
                                        disabled={isSubmitting}
                                    />
                                    {errors.building && (
                                        <p className="text-sm font-medium text-destructive">{errors.building.message}</p>
                                    )}
                                </Field>

                                <Field>
                                    <FieldLabel htmlFor="floor">Floor</FieldLabel>
                                    <Input
                                        {...register("floor")}
                                        id="floor"
                                        type="number"
                                        placeholder="e.g., 2"
                                        required
                                        disabled={isSubmitting}
                                    />
                                    {errors.floor && (
                                        <p className="text-sm font-medium text-destructive">{errors.floor.message}</p>
                                    )}
                                </Field>

                                <Field>
                                    <FieldLabel htmlFor="address">Address</FieldLabel>
                                    <Input
                                        {...register("address")}
                                        id="address"
                                        type="text"
                                        placeholder="e.g., 123 Main St"
                                        disabled={isSubmitting}
                                    />
                                    {errors.address && (
                                        <p className="text-sm font-medium text-destructive">{errors.address.message}</p>
                                    )}
                                </Field>

                                <Field>
                                    <FieldLabel htmlFor="place_name">Place Name</FieldLabel>
                                    <Input
                                        {...register("place_name")}
                                        id="place_name"
                                        type="text"
                                        placeholder="e.g., Smart Open Space HQ"
                                        disabled={isSubmitting}
                                    />
                                    {errors.place_name && (
                                        <p className="text-sm font-medium text-destructive">{errors.place_name.message}</p>
                                    )}
                                </Field>

                                <Field>
                                    <FieldLabel htmlFor="image_url">Image URL</FieldLabel>
                                    <Input
                                        {...register("image_url")}
                                        id="image_url"
                                        type="url"
                                        placeholder="https://example.com/image.jpg"
                                        disabled={isSubmitting}
                                    />
                                    {errors.image_url && (
                                        <p className="text-sm font-medium text-destructive">{errors.image_url.message}</p>
                                    )}
                                </Field>

                                <Field>
                                    <FieldLabel htmlFor="latitude">Latitude</FieldLabel>
                                    <Input
                                        {...register("latitude")}
                                        id="latitude"
                                        type="number"
                                        step="any"
                                        placeholder="e.g., 52.2297"
                                        disabled={isSubmitting}
                                    />
                                    {errors.latitude && (
                                        <p className="text-sm font-medium text-destructive">{errors.latitude.message}</p>
                                    )}
                                </Field>

                                <Field>
                                    <FieldLabel htmlFor="longitude">Longitude</FieldLabel>
                                    <Input
                                        {...register("longitude")}
                                        id="longitude"
                                        type="number"
                                        step="any"
                                        placeholder="e.g., 21.0122"
                                        disabled={isSubmitting}
                                    />
                                    {errors.longitude && (
                                        <p className="text-sm font-medium text-destructive">{errors.longitude.message}</p>
                                    )}
                                </Field>

                                <Field>
                                    <FieldLabel htmlFor="opened_at">Opened At</FieldLabel>
                                    <Input
                                        {...register("opened_at")}
                                        id="opened_at"
                                        type="datetime-local"
                                        disabled={isSubmitting}
                                    />
                                    {errors.opened_at && (
                                        <p className="text-sm font-medium text-destructive">{errors.opened_at.message}</p>
                                    )}
                                </Field>

                                <Field>
                                    <FieldLabel htmlFor="closed_at">Closed At</FieldLabel>
                                    <Input
                                        {...register("closed_at")}
                                        id="closed_at"
                                        type="datetime-local"
                                        disabled={isSubmitting}
                                    />
                                    {errors.closed_at && (
                                        <p className="text-sm font-medium text-destructive">{errors.closed_at.message}</p>
                                    )}
                                </Field>

                                <Field>
                                    <FieldLabel htmlFor="credits_per_hour">Credits per Hour</FieldLabel>
                                    <Input
                                        {...register("credits_per_hour")}
                                        id="credits_per_hour"
                                        type="number"
                                        placeholder="e.g., 10"

                                        required
                                        disabled={isSubmitting}
                                    />
                                    {errors.credits_per_hour && (
                                        <p className="text-sm font-medium text-destructive">{errors.credits_per_hour.message}</p>
                                    )}
                                </Field>

                                <Field>
                                    <FieldLabel htmlFor="max_daily_hours">Max Daily Hours</FieldLabel>
                                    <Input
                                        {...register("max_daily_hours")}
                                        id="max_daily_hours"
                                        type="number"
                                        placeholder="e.g., 10"

                                        required
                                        disabled={isSubmitting}
                                    />
                                    {errors.max_daily_hours && (
                                        <p className="text-sm font-medium text-destructive">{errors.max_daily_hours.message}</p>
                                    )}
                                </Field>
                                <Field>
                                    <FieldLabel htmlFor="period_credits">Period Credits</FieldLabel>
                                    <Input
                                        {...register("period_credits")}
                                        id="period_credits"
                                        type="number"
                                        placeholder="e.g., 50"

                                        required
                                        disabled={isSubmitting}
                                    />
                                    {errors.period_credits && (
                                        <p className="text-sm font-medium text-destructive">{errors.period_credits.message}</p>
                                    )}
                                </Field>

                                <Field>
                                    <FieldLabel htmlFor="late_checkout_penalty_hours">Late Checkout Penalty Hours</FieldLabel>
                                    <Input
                                        {...register("late_checkout_penalty_hours")}
                                        id="late_checkout_penalty_hours"
                                        type="number"
                                        placeholder="e.g., 50"

                                        required
                                        disabled={isSubmitting}
                                    />
                                    {errors.late_checkout_penalty_hours && (
                                        <p className="text-sm font-medium text-destructive">{errors.late_checkout_penalty_hours.message}</p>
                                    )}
                                </Field>

                                <Field>
                                    <FieldLabel htmlFor="no_show_penalty_hours">No Show Penalty Hours</FieldLabel>
                                    <Input
                                        {...register("no_show_penalty_hours")}
                                        id="no_show_penalty_hours"
                                        type="number"
                                        placeholder="e.g., 50"

                                        required
                                        disabled={isSubmitting}
                                    />
                                    {errors.no_show_penalty_hours && (
                                        <p className="text-sm font-medium text-destructive">{errors.no_show_penalty_hours.message}</p>
                                    )}
                                </Field>

                                <Field>
                                    <FieldLabel htmlFor="credit_reset_period">Credit Reset Period</FieldLabel>
                                    {/* <Input
                                        {...register("credit_reset_period")}
                                        id="credit_reset_period"
                                        type="number"
                                        placeholder="e.g., 50"

                                        required
                                        disabled={isSubmitting}
                                    /> */}
                                    <Controller render={({ field }) => (
                                        <Select
                                            onValueChange={(value) => field.onChange(value)}
                                            disabled={isSubmitting}
                                            value={field.value}
                                            name={field.name}
                                        >
                                            <SelectTrigger className="w-45">
                                                <SelectValue placeholder="Select period" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectGroup>
                                                    <SelectItem value="WEEKLY">Weekly</SelectItem>
                                                    <SelectItem value="MONTHLY">Monthly</SelectItem>
                                                </SelectGroup>
                                            </SelectContent>
                                        </Select>)}
                                        control={control}
                                        name="credit_reset_period"
                                        defaultValue="WEEKLY" />

                                    {errors.credit_reset_period && (
                                        <p className="text-sm font-medium text-destructive">{errors.credit_reset_period.message}</p>
                                    )}
                                </Field>
                            </div>

                            {serverError && (
                                <p className="text-sm text-center font-medium text-destructive">
                                    {serverError}
                                </p>
                            )}

                            <Field>
                                <Button type="submit" disabled={isSubmitting}>
                                    Update Settings
                                </Button>
                            </Field>
                        </FieldGroup>
                    </form>
                </CardContent>
            </Card>
        </div>
    )
}
