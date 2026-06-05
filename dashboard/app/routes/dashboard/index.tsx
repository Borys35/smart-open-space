import { useEffect, useState } from "react"
import type { ReactNode } from "react"
import { Link } from "react-router"
import { ArrowRightIcon, BellRingIcon, CalendarRangeIcon, Clock3Icon, UsersIcon } from "lucide-react"
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts"

import { Badge } from "~/components/ui/badge"
import { Button } from "~/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "~/components/ui/card"
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "~/components/ui/chart"
import { useOpenSpace } from "~/providers/OpenSpaceProvider"
import { fetchDashboardJson, formatAxisLabel, formatDuration } from "~/lib/dashboard-stats"
import type { DashboardHomeStatsResponse } from "~/lib/dashboard-stats"

export const handle = {
    title: "Dashboard",
}

const reservationChartConfig = {
    reservations: {
        label: "Reservations",
        color: "hsl(var(--chart-1))",
    },
} as const

function formatCredits(balance: number) {
    return new Intl.NumberFormat(undefined, { maximumFractionDigits: 1 }).format(balance)
}

function StatCard({
    title,
    value,
    description,
    icon,
}: {
    title: string
    value: string
    description: string
    icon: ReactNode
}) {
    return (
        <Card className="gap-4">
            <CardHeader className="flex flex-row items-start justify-between space-y-0">
                <div>
                    <CardDescription>{title}</CardDescription>
                    <CardTitle className="mt-2 text-3xl">{value}</CardTitle>
                </div>
                <div className="rounded-full border border-border/70 bg-muted p-2 text-muted-foreground">
                    {icon}
                </div>
            </CardHeader>
            <CardContent>
                <p className="text-sm text-muted-foreground">{description}</p>
            </CardContent>
        </Card>
    )
}

export default function Home() {
    const { activeOpenSpace } = useOpenSpace()
    const [summary, setSummary] = useState<DashboardHomeStatsResponse | null>(null)
    const [error, setError] = useState<string | null>(null)
    const [isLoading, setIsLoading] = useState(true)

    useEffect(() => {
        if (!activeOpenSpace?.id) {
            setSummary(null)
            setError(null)
            setIsLoading(false)
            return
        }

        const controller = new AbortController()

        setIsLoading(true)
        setError(null)

        fetchDashboardJson<DashboardHomeStatsResponse>(
            `/api/dashboard/open-spaces/${activeOpenSpace.id}/stats/summary`,
            controller.signal
        )
            .then(setSummary)
            .catch((fetchError) => {
                if (fetchError.name !== "AbortError") {
                    setError(fetchError.message)
                }
            })
            .finally(() => setIsLoading(false))

        return () => controller.abort()
    }, [activeOpenSpace?.id])

    const chartData =
        summary?.reservations_by_day.map((point) => ({
            label: formatAxisLabel(point.period_start),
            reservations: point.reservations,
        })) ?? []

    return (
        <div className="flex h-full w-full flex-col gap-6 overflow-y-auto p-4 md:p-6 lg:p-8">
            <section className="relative overflow-hidden rounded-3xl border bg-linear-to-br from-primary/10 via-background to-background p-6 shadow-sm">
                <div className="absolute inset-y-0 right-0 hidden w-1/3 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.55),transparent_60%)] md:block" />
                <div className="relative flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
                    <div className="max-w-3xl space-y-4">
                        <Badge variant="outline" className="w-fit border-primary/20 bg-background/80 text-primary">
                            Open space summary
                        </Badge>
                        <div>
                            <h1 className="text-3xl font-semibold tracking-tight md:text-4xl">
                                {activeOpenSpace?.name ?? "Select an open space to see the dashboard"}
                            </h1>
                            <p className="mt-3 max-w-2xl text-sm text-muted-foreground md:text-base">
                                A compact snapshot of reservations, users, credits, and renewals for the selected open space.
                            </p>
                        </div>
                        {activeOpenSpace ? (
                            <div className="flex flex-wrap gap-2 text-sm text-muted-foreground">
                                <Badge variant="secondary">{activeOpenSpace.building}</Badge>
                                <Badge variant="secondary">Floor {activeOpenSpace.floor}</Badge>
                                <Badge variant="secondary">Live summary</Badge>
                            </div>
                        ) : null}
                        <div className="flex flex-wrap gap-3">
                            <Button asChild>
                                <Link to="/statistics">
                                    Open statistics
                                    <ArrowRightIcon />
                                </Link>
                            </Button>
                            <Button asChild variant="outline">
                                <Link to="/reservations">Reservations</Link>
                            </Button>
                            <Button asChild variant="outline">
                                <Link to="/users/all">Users</Link>
                            </Button>
                        </div>
                    </div>

                    <div className="grid gap-3 rounded-2xl border bg-background/80 p-4 shadow-sm backdrop-blur md:grid-cols-2 lg:w-md">
                        <div>
                            <p className="text-sm text-muted-foreground">Reservations this week</p>
                            <p className="mt-1 text-3xl font-semibold">{summary?.reservations_this_week ?? 0}</p>
                        </div>
                        <div>
                            <p className="text-sm text-muted-foreground">Average credits</p>
                            <p className="mt-1 text-3xl font-semibold">
                                {summary ? formatCredits(summary.avg_credits_balance) : "0"}
                            </p>
                        </div>
                        <div>
                            <p className="text-sm text-muted-foreground">Users</p>
                            <p className="mt-1 text-3xl font-semibold">{summary?.active_users ?? 0}</p>
                        </div>
                        <div>
                            <p className="text-sm text-muted-foreground">Renewal</p>
                            <p className="mt-1 text-3xl font-semibold">
                                {formatDuration(summary?.credit_renewal.time_until_reset_seconds ?? null)}
                            </p>
                        </div>
                    </div>
                </div>
            </section>

            {error ? (
                <Card className="border-destructive/40 bg-destructive/5">
                    <CardContent className="pt-6 text-sm text-destructive">{error}</CardContent>
                </Card>
            ) : null}

            {!activeOpenSpace ? (
                <Card>
                    <CardHeader>
                        <CardTitle>No open space selected</CardTitle>
                        <CardDescription>Select an open space in the switcher to load live metrics.</CardDescription>
                    </CardHeader>
                </Card>
            ) : isLoading ? (
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                    {Array.from({ length: 4 }).map((_, index) => (
                        <Card key={index} className="h-40 animate-pulse bg-muted/30" />
                    ))}
                </div>
            ) : (
                <>
                    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                        <StatCard
                            title="Active memberships"
                            value={String(summary?.active_memberships ?? 0)}
                            description="People currently enrolled in the open space."
                            icon={<UsersIcon className="h-4 w-4" />}
                        />
                        <StatCard
                            title="Pending invitations"
                            value={String(summary?.pending_invitations ?? 0)}
                            description="Users waiting to join the space."
                            icon={<BellRingIcon className="h-4 w-4" />}
                        />
                        <StatCard
                            title="Credit renewals"
                            value={summary?.credit_renewal.credit_reset_period ?? "-"}
                            description={`Next reset: ${formatDuration(summary?.credit_renewal.time_until_reset_seconds ?? null)}`}
                            icon={<Clock3Icon className="h-4 w-4" />}
                        />
                        <StatCard
                            title="Access logs this week"
                            value={String(summary?.access_logs_this_week ?? 0)}
                            description="Check-ins and check-outs recorded in the current week."
                            icon={<CalendarRangeIcon className="h-4 w-4" />}
                        />
                    </div>

                    <div className="grid gap-4 xl:grid-cols-[1.6fr_1fr]">
                        <Card>
                            <CardHeader>
                                <CardTitle>Reservations over the week</CardTitle>
                                <CardDescription>High-level weekly activity for the selected open space.</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <ChartContainer config={reservationChartConfig} className="h-80 w-full">
                                    <BarChart data={chartData} margin={{ left: 4, right: 12 }}>
                                        <CartesianGrid vertical={false} strokeDasharray="3 3" />
                                        <XAxis
                                            dataKey="label"
                                            tickLine={false}
                                            axisLine={false}
                                            tickMargin={10}
                                            fontSize={12}
                                        />
                                        <YAxis tickLine={false} axisLine={false} fontSize={12} width={32} />
                                        <ChartTooltip content={<ChartTooltipContent indicator="dot" />} />
                                        <Bar dataKey="reservations" fill="var(--color-reservations)" radius={8} />
                                    </BarChart>
                                </ChartContainer>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader>
                                <CardTitle>Operational snapshot</CardTitle>
                                <CardDescription>Fast reading of the numbers the team needs first.</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="rounded-2xl border p-4">
                                    <div className="flex items-center justify-between gap-3">
                                        <div>
                                            <p className="text-sm text-muted-foreground">Average credits left</p>
                                            <p className="mt-1 text-2xl font-semibold">
                                                {summary ? formatCredits(summary.avg_credits_balance) : "0"}
                                            </p>
                                        </div>
                                        <Badge variant="outline">
                                            {summary?.min_credits_balance ?? 0} - {summary?.max_credits_balance ?? 0}
                                        </Badge>
                                    </div>
                                    <p className="mt-3 text-sm text-muted-foreground">Range across active memberships.</p>
                                </div>

                                <div className="rounded-2xl border p-4">
                                    <div className="flex items-center justify-between gap-3">
                                        <div>
                                            <p className="text-sm text-muted-foreground">Renewal countdown</p>
                                            <p className="mt-1 text-2xl font-semibold">
                                                {formatDuration(summary?.credit_renewal.time_until_reset_seconds ?? null)}
                                            </p>
                                        </div>
                                        <Badge variant="secondary">{summary?.credit_renewal.period_credits ?? 0} credits</Badge>
                                    </div>
                                    <p className="mt-3 text-sm text-muted-foreground">
                                        Reset cadence: {summary?.credit_renewal.credit_reset_period ?? "-"}
                                    </p>
                                </div>

                                <div className="rounded-2xl border p-4">
                                    <div className="flex items-center justify-between gap-3">
                                        <div>
                                            <p className="text-sm text-muted-foreground">Invitations pending</p>
                                            <p className="mt-1 text-2xl font-semibold">{summary?.pending_invitations ?? 0}</p>
                                        </div>
                                        <Badge variant="outline">{summary?.reservation_status_breakdown.length ?? 0} statuses</Badge>
                                    </div>
                                    <p className="mt-3 text-sm text-muted-foreground">
                                        Use the statistics page for deeper breakdowns and time series.
                                    </p>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </>
            )}
        </div>
    )
}
