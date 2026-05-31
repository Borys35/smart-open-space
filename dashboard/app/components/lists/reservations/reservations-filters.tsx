import { Button } from "@/components/ui/button"
import { Field, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import {
    Select,
    SelectContent,
    SelectGroup,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"

export const SORT_VALUES = {
    start_time_desc: "Start time (desc)",
    start_time_asc: "Start time (asc)",
    end_time_desc: "End time (desc)",
    end_time_asc: "End time (asc)",
} as const

export const STATUS_FILTER_VALUES = {
    ALL: "All statuses",
    PENDING: "Pending",
    CONFIRMED: "Confirmed",
    CANCELLED: "Cancelled",
    DONE: "Done",
} as const

export const TIME_FILTER_VALUES = {
    all: "All time",
    today: "Today",
    next_7_days: "Next 7 days",
    this_month: "This month",
    custom: "Custom range",
} as const

export type ReservationSortValue = keyof typeof SORT_VALUES
export type ReservationStatusFilterValue = keyof typeof STATUS_FILTER_VALUES
export type ReservationTimeFilterValue = keyof typeof TIME_FILTER_VALUES

interface DeskOption {
    id: number;
    label: string;
}

interface ReservationsFiltersProps {
    sort: ReservationSortValue;
    status: ReservationStatusFilterValue;
    deskId: string;
    deskOptions: DeskOption[];
    timeFilter: ReservationTimeFilterValue;
    dateFrom: string;
    dateTo: string;
    onSortChange: (value: ReservationSortValue) => void;
    onStatusChange: (value: ReservationStatusFilterValue) => void;
    onDeskChange: (value: string) => void;
    onTimeFilterChange: (value: ReservationTimeFilterValue) => void;
    onDateFromChange: (value: string) => void;
    onDateToChange: (value: string) => void;
    onClearFilters: () => void;
}

export default function ReservationsFilters({
    sort,
    status,
    deskId,
    deskOptions,
    timeFilter,
    dateFrom,
    dateTo,
    onSortChange,
    onStatusChange,
    onDeskChange,
    onTimeFilterChange,
    onDateFromChange,
    onDateToChange,
    onClearFilters,
}: ReservationsFiltersProps) {
    return (
        <div className="mb-4 rounded-md border p-4">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-6">
                <Field>
                    <FieldLabel htmlFor="reservations-sort">Sort</FieldLabel>
                    <Select value={sort} onValueChange={(value) => onSortChange(value as ReservationSortValue)}>
                        <SelectTrigger className="w-full" id="reservations-sort">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectGroup>
                                {Object.entries(SORT_VALUES).map(([value, label]) => (
                                    <SelectItem key={value} value={value}>{label}</SelectItem>
                                ))}
                            </SelectGroup>
                        </SelectContent>
                    </Select>
                </Field>

                <Field>
                    <FieldLabel htmlFor="reservations-status">Status</FieldLabel>
                    <Select value={status} onValueChange={(value) => onStatusChange(value as ReservationStatusFilterValue)}>
                        <SelectTrigger className="w-full" id="reservations-status">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectGroup>
                                {Object.entries(STATUS_FILTER_VALUES).map(([value, label]) => (
                                    <SelectItem key={value} value={value}>{label}</SelectItem>
                                ))}
                            </SelectGroup>
                        </SelectContent>
                    </Select>
                </Field>

                <Field>
                    <FieldLabel htmlFor="reservations-desk">Desk</FieldLabel>
                    <Select value={deskId} onValueChange={onDeskChange}>
                        <SelectTrigger className="w-full" id="reservations-desk">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectGroup>
                                <SelectItem value="ALL">All desks</SelectItem>
                                {deskOptions.map((desk) => (
                                    <SelectItem key={desk.id} value={String(desk.id)}>{desk.label}</SelectItem>
                                ))}
                            </SelectGroup>
                        </SelectContent>
                    </Select>
                </Field>

                <Field>
                    <FieldLabel htmlFor="reservations-time-filter">Time range</FieldLabel>
                    <Select value={timeFilter} onValueChange={(value) => onTimeFilterChange(value as ReservationTimeFilterValue)}>
                        <SelectTrigger className="w-full" id="reservations-time-filter">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectGroup>
                                {Object.entries(TIME_FILTER_VALUES).map(([value, label]) => (
                                    <SelectItem key={value} value={value}>{label}</SelectItem>
                                ))}
                            </SelectGroup>
                        </SelectContent>
                    </Select>
                </Field>

                <Field>
                    <FieldLabel htmlFor="reservations-date-from">From</FieldLabel>
                    <Input
                        id="reservations-date-from"
                        type="datetime-local"
                        value={dateFrom}
                        onChange={(event) => onDateFromChange(event.target.value)}
                        disabled={timeFilter !== "custom"}
                    />
                </Field>

                <Field>
                    <FieldLabel htmlFor="reservations-date-to">To</FieldLabel>
                    <Input
                        id="reservations-date-to"
                        type="datetime-local"
                        value={dateTo}
                        onChange={(event) => onDateToChange(event.target.value)}
                        disabled={timeFilter !== "custom"}
                    />
                </Field>
            </div>

            <div className="mt-4 flex justify-end">
                <Button variant="outline" size="sm" onClick={onClearFilters}>Clear filters</Button>
            </div>
        </div>
    )
}