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

const openSpaceSchema = z.object({
    name: z.string().min(1, "Name is required"),
    building: z.string().min(1, "Building name is required"),
    floor: z.coerce.number({ invalid_type_error: "Floor must be a number" }),
})

type OpenSpaceFormValues = z.infer<typeof openSpaceSchema>

export function CreateOpenSpaceForm({
    className,
    ...props
}: React.ComponentProps<"div">) {
    const [serverError, setServerError] = useState<string | null>(null)
    const navigate = useNavigate()

    const {
        register,
        handleSubmit,
        formState: { errors, isSubmitting },
    } = useForm<OpenSpaceFormValues>({
        resolver: zodResolver(openSpaceSchema),
        defaultValues: {
            name: "",
            building: "",
        },
    })

    const onSubmit = async (data: OpenSpaceFormValues) => {
        setServerError(null)
        try {
            const response = await fetch("/api/dashboard/open-spaces", {
                method: "POST",
                credentials: "include",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(data),
            })

            const result = await response.json()

            if (!response.ok) {
                throw new Error(result.detail || "Something went wrong")
            }

            console.log("Open space created:", result)
            navigate("/") // Redirect back to dashboard or appropriate route
        } catch (error: any) {
            setServerError(error.message)
        }
    }

    return (
        <div className={cn("flex flex-col gap-6", className)} {...props}>
            <Card>
                <CardHeader>
                    <CardTitle>Create Open Space</CardTitle>
                    <CardDescription>
                        Fill in the details for your new open space.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSubmit(onSubmit)}>
                        <FieldGroup>
                            <Field>
                                <FieldLabel htmlFor="name">Name</FieldLabel>
                                <Input
                                    {...register("name")}
                                    id="name"
                                    type="text"
                                    placeholder="e.g., PWr D21 Lab"
                                    required
                                    disabled={isSubmitting}
                                />
                                {errors.name && (
                                    <p className="text-sm font-medium text-destructive">{errors.name.message}</p>
                                )}
                            </Field>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

                                <Field>
                                    <div className="flex items-center">
                                        <FieldLabel htmlFor="building">Building Name</FieldLabel>
                                    </div>
                                    <Input
                                        {...register("building")}
                                        id="building"
                                        type="text"
                                        placeholder="e.g., PWr D21"
                                        required
                                        disabled={isSubmitting}
                                    />
                                    {errors.building && (
                                        <p className="text-sm font-medium text-destructive">{errors.building.message}</p>
                                    )}
                                </Field>

                                <Field>
                                    <div className="flex items-center">
                                        <FieldLabel htmlFor="floor">Floor no.</FieldLabel>
                                    </div>
                                    <Input
                                        {...register("floor")}
                                        id="floor"
                                        type="number"
                                        placeholder="e.g., 1, 2, 3"
                                        required
                                        disabled={isSubmitting}
                                    />
                                    {errors.floor && (
                                        <p className="text-sm font-medium text-destructive">{errors.floor.message}</p>
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
                                    Create
                                </Button>
                            </Field>
                        </FieldGroup>
                    </form>
                </CardContent>
            </Card>
        </div>
    )
}
