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
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "../ui/select"


const openSpaceSchema = z.object({
    credits_per_hour: z.coerce.number({ invalid_type_error: "Credits per hour must be a number" }),
    max_daily_hours: z.coerce.number({ invalid_type_error: "Max daily hours must be a number" }),
    period_credits: z.coerce.number({ invalid_type_error: "Period credits must be a number" }),
    credit_reset_period: z.string().min(1, "Credit reset period is required").transform((value) => value.trim().toUpperCase()).refine((value) => ["WEEKLY", "MONTHLY"].includes(value), "Credit reset period must be WEEKLY or MONTHLY"),
})

type OpenSpaceFormValues = z.infer<typeof openSpaceSchema>

export function OpenSpaceSettingsForm({
    className,
    ...props
}: React.ComponentProps<"div">) {
    const [serverError, setServerError] = useState<string | null>(null)
    const navigate = useNavigate()
    const { reloadOpenSpaces, activeOpenSpace } = useOpenSpace()
    const {
        register,
        handleSubmit,
        formState: { errors, isSubmitting },
        control
    } = useForm<OpenSpaceFormValues>({
        resolver: zodResolver(openSpaceSchema),
        defaultValues: {
            credits_per_hour: 0,
            max_daily_hours: 0,
            period_credits: 0,
            credit_reset_period: "WEEKLY",
        },
    })

    const onSubmit = async (data: OpenSpaceFormValues) => {
        setServerError(null)
        try {
            const response = await fetch(`/api/dashboard/open-spaces/${activeOpenSpace?.id}/settings`, {
                method: "PATCH",
                credentials: "include",
                headers: { "Content-Type": "application/json", "Authorization": "Bearer " + localStorage.getItem("accessToken") },
                body: JSON.stringify(data),
            })

            const result = await response.json()

            if (!response.ok) {
                throw new Error(result.detail || "Something went wrong")
            }

            // reloadOpenSpaces() // Reload the list of open spaces
            // navigate("/") // Redirect back to dashboard or appropriate route
        } catch (error: any) {
            setServerError(error.message)
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
                                            <SelectTrigger className="w-[180px]">
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
