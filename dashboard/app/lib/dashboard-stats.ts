export interface DashboardStatPoint {
    period_start: string
    period_end: string
    reservations: number
    access_logs: number
    check_ins: number
    check_outs: number
    successful_access_logs: number
    denied_access_logs: number
    invitations: number
}

export interface DashboardStatusCount {
    status: string
    count: number
}

export interface DashboardCreditRenewal {
    credit_reset_period: string
    period_credits: number
    last_credit_reset_at: string | null
    next_credit_reset_at: string | null
    time_until_reset_seconds: number | null
}

export interface DashboardHomeStatsResponse {
    open_space_id: number
    reservations_this_week: number
    reservations_by_day: DashboardStatPoint[]
    active_memberships: number
    active_users: number
    pending_invitations: number
    avg_credits_balance: number
    min_credits_balance: number | null
    max_credits_balance: number | null
    credit_renewal: DashboardCreditRenewal
    reservation_status_breakdown: DashboardStatusCount[]
    membership_status_breakdown: DashboardStatusCount[]
    invitation_status_breakdown: DashboardStatusCount[]
    access_logs_this_week: number
    check_ins_this_week: number
    check_outs_this_week: number
}

export interface DashboardAnalyticsResponse {
    open_space_id: number
    date_from: string
    date_to: string
    group_by: string
    reservations_over_time: DashboardStatPoint[]
    access_over_time: DashboardStatPoint[]
    invitation_over_time: DashboardStatPoint[]
    reservation_status_breakdown: DashboardStatusCount[]
    membership_status_breakdown: DashboardStatusCount[]
    invitation_status_breakdown: DashboardStatusCount[]
    access_result_breakdown: DashboardStatusCount[]
    access_action_breakdown: DashboardStatusCount[]
    total_reservations: number
    total_access_logs: number
    total_invitations: number
    active_memberships: number
    active_users: number
    avg_credits_balance: number
    credit_renewal: DashboardCreditRenewal
}

export async function fetchDashboardJson<T>(url: string, signal?: AbortSignal): Promise<T> {
    const response = await fetch(url, {
        credentials: "include",
        signal,
        headers: {
            Authorization: "Bearer " + localStorage.getItem("accessToken"),
        },
    })

    if (!response.ok) {
        let message = "Request failed"

        try {
            const payload = await response.json()
            message = payload?.detail ?? message
        } catch {
            message = response.statusText || message
        }

        throw new Error(message)
    }

    return response.json() as Promise<T>
}

export function formatDuration(seconds: number | null): string {
    if (seconds == null) {
        return "Not scheduled"
    }

    const totalMinutes = Math.max(0, Math.floor(seconds / 60))
    const days = Math.floor(totalMinutes / 1440)
    const hours = Math.floor((totalMinutes % 1440) / 60)
    const minutes = totalMinutes % 60

    if (days > 0) {
        return `${days}d ${hours}h left`
    }

    if (hours > 0) {
        return `${hours}h ${minutes}m left`
    }

    return `${minutes}m left`
}

export function formatDateLabel(value: string): string {
    return new Intl.DateTimeFormat(undefined, {
        month: "short",
        day: "numeric",
    }).format(new Date(value))
}

export function formatAxisLabel(value: string): string {
    return new Intl.DateTimeFormat(undefined, {
        weekday: "short",
        month: "short",
        day: "numeric",
    }).format(new Date(value))
}