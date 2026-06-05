import { useEffect, useMemo, useState } from "react"
import type { ReactNode } from "react"
import { useSearchParams } from "react-router"
import { ArrowRightIcon, CalendarDaysIcon, LineChartIcon, TrendingUpIcon } from "lucide-react"
import { Bar, BarChart, CartesianGrid, Line, LineChart, XAxis, YAxis } from "recharts"

import { Badge } from "~/components/ui/badge"
import { Button } from "~/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "~/components/ui/card"
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "~/components/ui/chart"
import { useOpenSpace } from "~/providers/OpenSpaceProvider"
import { fetchDashboardJson, formatAxisLabel, formatDateLabel, formatDuration } from "~/lib/dashboard-stats"
import type { DashboardAnalyticsResponse, DashboardStatusCount } from "~/lib/dashboard-stats"

export const handle = {
    title: "Statistics",
}

const overviewChartConfig = {
    reservations: {
        label: "Reservations",
        color: "hsl(var(--chart-1))",
    },
    access_logs: {
        label: "Access logs",
        color: "hsl(var(--chart-2))",
    },
    invitations: {
        label: "Invitations",
        color: "hsl(var(--chart-3))",
    },
} as const

const breakdownChartConfig = {
    count: {
        label: "Count",
        color: "hsl(var(--chart-1))",
    },
} as const

type RangePreset = "7d" | "30d" | "90d"
type GroupBy = "day" | "week" | "month"

function buildRange(preset: RangePreset) {
    const now = new Date()
    const start = new Date(now)

    if (preset === "7d") {
        start.setDate(start.getDate() - 7)
    } else if (preset === "30d") {
        start.setDate(start.getDate() - 30)
    } else {
        start.setDate(start.getDate() - 90)
    }

    return {
        date_from: start.toISOString(),
        date_to: now.toISOString(),
    }
}

function readPreset(value: string | null): RangePreset {
    if (value === "7d" || value === "30d" || value === "90d") {
        return value
    }

    return "30d"
}

function readGroupBy(value: string | null): GroupBy {
    if (value === "day" || value === "week" || value === "month") {
        return value
    }

    return "day"
}

function breakdownToChartData(items: DashboardStatusCount[]) {
    return items.map((item) => ({
        status: item.status,
        count: item.count,
    }))
}

function MetricCard({
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

function StatusBreakdownCard({
    title,
    description,
    items,
}: {
    title: string
    description: string
    items: DashboardStatusCount[]
}) {
    const total = items.reduce((sum, item) => sum + item.count, 0)

    return (
        <Card>
            <CardHeader>
                <CardTitle>{title}</CardTitle>
                <CardDescription>{description}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
                {items.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No data in the selected range.</p>
                ) : (
                    items.map((item) => {
                        const percentage = total > 0 ? Math.round((item.count / total) * 100) : 0

                        return (
                            <div key={item.status} className="space-y-1">
                                <div className="flex items-center justify-between gap-3 text-sm">
                                    <span className="font-medium">{item.status}</span>
                                    <span className="text-muted-foreground">{item.count} ({percentage}%)</span>
                                </div>
                                <div className="h-2 rounded-full bg-muted">
                                    <div className="h-2 rounded-full bg-primary" style={{ width: `${Math.max(5, percentage)}%` }} />
                                </div>
                            </div>
                        )
                    })
                )}
            </CardContent>
        </Card>
    )
}

function formatNumber(value: number) {
    return new Intl.NumberFormat(undefined, { maximumFractionDigits: 1 }).format(value)
}

export default function Statistics() {
    const { activeOpenSpace } = useOpenSpace()
    const [searchParams, setSearchParams] = useSearchParams()
    const [rangePreset, setRangePreset] = useState<RangePreset>(() => readPreset(searchParams.get("range")))
    const [groupBy, setGroupBy] = useState<GroupBy>(() => readGroupBy(searchParams.get("group_by")))
    const [stats, setStats] = useState<DashboardAnalyticsResponse | null>(null)
    const [error, setError] = useState<string | null>(null)
    const [isLoading, setIsLoading] = useState(true)

    useEffect(() => {
        const nextRange = readPreset(searchParams.get("range"))
        const nextGroupBy = readGroupBy(searchParams.get("group_by"))

        setRangePreset((current) => (current === nextRange ? current : nextRange))
        setGroupBy((current) => (current === nextGroupBy ? current : nextGroupBy))
    }, [searchParams])

    useEffect(() => {
        if (!activeOpenSpace?.id) {
            setStats(null)
            setError(null)
            setIsLoading(false)
            return
        }

        const controller = new AbortController()
        const range = buildRange(rangePreset)
        const params = new URLSearchParams({
            ...range,
            group_by: groupBy,
        })

        setIsLoading(true)
        setError(null)

        fetchDashboardJson<DashboardAnalyticsResponse>(
            `/api/dashboard/open-spaces/${activeOpenSpace.id}/stats?${params.toString()}`,
            controller.signal
        )
            .then(setStats)
            .catch((fetchError) => {
                if (fetchError.name !== "AbortError") {
                    setError(fetchError.message)
                }
            })
            .finally(() => setIsLoading(false))

        setSearchParams(
            {
                range: rangePreset,
                group_by: groupBy,
            },
            { replace: true }
        )

        return () => controller.abort()
    }, [activeOpenSpace?.id, rangePreset, groupBy, setSearchParams])

    const timeSeriesData =
        stats?.reservations_over_time.map((point) => ({
            label: formatAxisLabel(point.period_start),
            reservations: point.reservations,
            access_logs: point.access_logs,
            invitations: point.invitations,
        })) ?? []

    const accessBreakdownData = useMemo(
        () => breakdownToChartData(stats?.access_result_breakdown ?? []),
        [stats?.access_result_breakdown]
    )

    return (
        <div className="flex h-full w-full flex-col gap-6 overflow-y-auto p-4 md:p-6 lg:p-8">
            <section className="flex flex-col gap-4 rounded-3xl border bg-gradient-to-br from-background via-primary/5 to-background p-6 shadow-sm lg:flex-row lg:items-end lg:justify-between">
                <div className="max-w-3xl space-y-3">
                    <Badge variant="outline" className="w-fit border-primary/20 bg-background/80 text-primary">
                        Detailed analytics
                    </Badge>
                    <div>
                        <h1 className="text-3xl font-semibold tracking-tight md:text-4xl">
                            Statistics for {activeOpenSpace?.name ?? "the selected open space"}
                        </h1>
                        <p className="mt-3 max-w-2xl text-sm text-muted-foreground md:text-base">
                            Reservation trends, access activity, invitations, and credit health in one analytics workspace.
                        </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        <Badge variant="secondary">{activeOpenSpace?.building ?? "No building selected"}</Badge>
                        <Badge variant="secondary">{stats?.group_by ?? groupBy} grouping</Badge>
                        <Badge variant="secondary">
                            {stats ? `${formatDateLabel(stats.date_from)} - ${formatDateLabel(stats.date_to)}` : "No range"}
                        </Badge>
                    </div>
                </div>

                <div className="flex flex-wrap gap-2">
                    {(["7d", "30d", "90d"] as RangePreset[]).map((preset) => (
                        <Button
                            key={preset}
                            variant={rangePreset === preset ? "default" : "outline"}
                            size="sm"
                            onClick={() => setRangePreset(preset)}
                        >
                            {preset}
                        </Button>
                    ))}
                    {(["day", "week", "month"] as GroupBy[]).map((value) => (
                        <Button
                            key={value}
                            variant={groupBy === value ? "secondary" : "outline"}
                            size="sm"
                            onClick={() => setGroupBy(value)}
                        >
                            {value}
                        </Button>
                    ))}
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
                        <CardDescription>Select an open space in the switcher to load analytics.</CardDescription>
                    </CardHeader>
                </Card>
            ) : isLoading ? (
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                    {Array.from({ length: 4 }).map((_, index) => (
                        <Card key={index} className="h-[10rem] animate-pulse bg-muted/30" />
                    ))}
                </div>
            ) : stats ? (
                <>
                    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                        <MetricCard
                            title="Reservations"
                            value={formatNumber(stats.total_reservations)}
                            description="Total reservations inside the selected range."
                            icon={<TrendingUpIcon className="h-4 w-4" />}
                        />
                        <MetricCard
                            title="Access logs"
                            value={formatNumber(stats.total_access_logs)}
                            description="Access events recorded in the selected range."
                            icon={<CalendarDaysIcon className="h-4 w-4" />}
                        />
                        <MetricCard
                            title="Invitations"
                            value={formatNumber(stats.total_invitations)}
                            description="Pending, accepted, rejected, and expired invites."
                            icon={<LineChartIcon className="h-4 w-4" />}
                        />
                        <MetricCard
                            title="Average credits"
                            value={formatNumber(stats.avg_credits_balance)}
                            description={`Renewal in ${formatDuration(stats.credit_renewal.time_until_reset_seconds)}`}
                            icon={<ArrowRightIcon className="h-4 w-4" />}
                        />
                    </div>

                    <div className="grid gap-4 xl:grid-cols-[1.6fr_1fr]">
                        <Card>
                            <CardHeader>
                                <CardTitle>Activity over time</CardTitle>
                                <CardDescription>Reservations, access logs, and invitations for the selected range.</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <ChartContainer config={overviewChartConfig} className="h-[360px] w-full">
                                    <LineChart data={timeSeriesData} margin={{ left: 4, right: 12 }}>
                                        <CartesianGrid vertical={false} strokeDasharray="3 3" />
                                        <XAxis dataKey="label" tickLine={false} axisLine={false} tickMargin={10} fontSize={12} />
                                        <YAxis tickLine={false} axisLine={false} fontSize={12} width={32} />
                                        <ChartTooltip content={<ChartTooltipContent indicator="line" />} />
                                        <Line type="monotone" dataKey="reservations" stroke="var(--color-reservations)" strokeWidth={2.5} dot={false} />
                                        <Line type="monotone" dataKey="access_logs" stroke="var(--color-access_logs)" strokeWidth={2.5} dot={false} />
                                        <Line type="monotone" dataKey="invitations" stroke="var(--color-invitations)" strokeWidth={2.5} dot={false} />
                                    </LineChart>
                                </ChartContainer>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader>
                                <CardTitle>Credit renewal</CardTitle>
                                <CardDescription>Everything the team needs to know about the reset cycle.</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="rounded-2xl border p-4">
                                    <div className="flex items-center justify-between gap-3">
                                        <div>
                                            <p className="text-sm text-muted-foreground">Time until next reset</p>
                                            <p className="mt-1 text-2xl font-semibold">
                                                {formatDuration(stats.credit_renewal.time_until_reset_seconds)}
                                            </p>
                                        </div>
                                        <Badge variant="outline">{stats.credit_renewal.credit_reset_period}</Badge>
                                    </div>
                                    <p className="mt-3 text-sm text-muted-foreground">
                                        Last reset: {stats.credit_renewal.last_credit_reset_at ? formatDateLabel(stats.credit_renewal.last_credit_reset_at) : "Unknown"}
                                    </p>
                                </div>

                                <div className="rounded-2xl border p-4">
                                    <p className="text-sm text-muted-foreground">Period credits</p>
                                    <p className="mt-1 text-2xl font-semibold">{stats.credit_renewal.period_credits}</p>
                                    <p className="mt-3 text-sm text-muted-foreground">
                                        Active memberships: {stats.active_memberships} · Active users: {stats.active_users}
                                    </p>
                                </div>

                                <div className="rounded-2xl border p-4">
                                    <p className="text-sm text-muted-foreground">Access result mix</p>
                                    <ChartContainer config={breakdownChartConfig} className="h-[180px] w-full">
                                        <BarChart data={accessBreakdownData} layout="vertical" margin={{ left: 16, right: 16 }}>
                                            <CartesianGrid horizontal={false} />
                                            <XAxis type="number" tickLine={false} axisLine={false} fontSize={12} />
                                            <YAxis type="category" dataKey="status" tickLine={false} axisLine={false} width={90} fontSize={12} />
                                            <ChartTooltip content={<ChartTooltipContent indicator="dot" />} />
                                            <Bar dataKey="count" fill="var(--color-count)" radius={8} />
                                        </BarChart>
                                    </ChartContainer>
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    <div className="grid gap-4 xl:grid-cols-2">
                        <StatusBreakdownCard
                            title="Reservation statuses"
                            description="How reservations are distributed across lifecycle states."
                            items={stats.reservation_status_breakdown}
                        />
                        <StatusBreakdownCard
                            title="Invitation statuses"
                            description="Invitation pipeline health in the selected time window."
                            items={stats.invitation_status_breakdown}
                        />
                    </div>

                    <div className="grid gap-4 xl:grid-cols-2">
                        <StatusBreakdownCard
                            title="Membership statuses"
                            description="Current membership state for the open space."
                            items={stats.membership_status_breakdown}
                        />
                        <StatusBreakdownCard
                            title="Access results"
                            description="Successful versus denied access events."
                            items={stats.access_result_breakdown}
                        />
                    </div>
                </>
            ) : null}
        </div>
    )
}