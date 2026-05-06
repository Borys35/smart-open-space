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

const inviteUserSchema = z.object({
    email: z.string().email("Please enter a valid email address"),
})

type InviteUserFormValues = z.infer<typeof inviteUserSchema>

interface InviteUserFormProps extends React.ComponentProps<"div"> {
    openSpaceId: string;
}

export function InviteUserForm({
    className,
    openSpaceId,
    ...props
}: InviteUserFormProps) {
    const [serverError, setServerError] = useState<string | null>(null)
    const navigate = useNavigate()

    const {
        register,
        handleSubmit,
        formState: { errors, isSubmitting },
    } = useForm<InviteUserFormValues>({
        resolver: zodResolver(inviteUserSchema),
        defaultValues: {
            email: "",
        },
    })

    const onSubmit = async (data: InviteUserFormValues) => {
        setServerError(null)
        try {
            const response = await fetch(`/api/dashboard/open-spaces/${openSpaceId}/invite`, {
                method: "POST",
                credentials: "include",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(data),
            })

            const result = await response.json()

            if (!response.ok) {
                throw new Error(result.detail || "Something went wrong")
            }

            console.log("User invited:", result)
            navigate("/") // Redirect back to dashboard or appropriate route
        } catch (error: any) {
            setServerError(error.message)
        }
    }

    return (
        <div className={cn("flex flex-col gap-6", className)} {...props}>
            <Card>
                <CardHeader>
                    <CardTitle>Invite User</CardTitle>
                    <CardDescription>
                        Invite a new user to this open space.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSubmit(onSubmit)}>
                        <FieldGroup>
                            <Field>
                                <FieldLabel htmlFor="email">User's e-mail</FieldLabel>
                                <FieldDescription>Enter the e-mail address of the user you want to invite.  </FieldDescription>
                                <Input
                                    {...register("email")}
                                    id="email"
                                    type="email"
                                    placeholder="e.g., user@example.com"
                                    required
                                    disabled={isSubmitting}
                                />
                                {errors.email && (
                                    <p className="text-sm font-medium text-destructive">{errors.email.message}</p>
                                )}
                            </Field>

                            {serverError && (
                                <p className="text-sm text-center font-medium text-destructive">
                                    {serverError}
                                </p>
                            )}

                            <Field>
                                <Button type="submit" disabled={isSubmitting}>
                                    Send Invite
                                </Button>
                            </Field>
                        </FieldGroup>
                    </form>
                </CardContent>
            </Card>
        </div>
    )
}
