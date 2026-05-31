import { useEffect, useMemo, useState } from "react"
import { useOpenSpace } from "~/providers/OpenSpaceProvider"
import { cn } from "~/lib/utils"

export type LiveDesk = {
    id: number;
    x: number;
    y: number;
    width: number;
    height: number;
    data: string;
}

interface DeskAvailabilityItem {
    id: number;
    data: string;
    x: number;
    y: number;
    width: number;
    height: number;
    status: string;
    is_occupied: boolean;
    next_reservation: {
        id: number;
        start_time: string;
        end_time: string;
        user_id: number;
    } | null;
}

function statusLabel(isOccupied: boolean, status: string) {
    if (isOccupied) {
        return "Occupied"
    }

    if (status === "AVAILABLE") {
        return "Available"
    }

    return status
}

export default function DesksLiveView() {
    const [desks, setDesks] = useState<DeskAvailabilityItem[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const { activeOpenSpace } = useOpenSpace()

    useEffect(() => {
        if (!activeOpenSpace?.id) {
            setDesks([])
            setIsLoading(false)
            return
        }

        let isCancelled = false
        setIsLoading(true)
        setError(null)

        fetch(`/api/dashboard/open-spaces/${activeOpenSpace.id}/desks/availability`, {
            headers: {
                Authorization: `Bearer ${localStorage.getItem("accessToken")}`,
            },
        })
            .then((response) => {
                if (!response.ok) {
                    throw new Error("Failed to load live desks")
                }

                return response.json()
            })
            .then((data: DeskAvailabilityItem[]) => {
                if (isCancelled) {
                    return
                }

                setDesks(data)
            })
            .catch((fetchError: Error) => {
                if (!isCancelled) {
                    setError(fetchError.message)
                    setDesks([])
                }
            })
            .finally(() => {
                if (!isCancelled) {
                    setIsLoading(false)
                }
            })

        return () => {
            isCancelled = true
        }
    }, [activeOpenSpace?.id])

    const liveOverlaps = useMemo(() => new Set<number>(), [])

    return (
        <div className="flex h-full min-h-0 min-w-0 flex-col p-4 md:p-6 lg:p-8">
            <h1 className="text-2xl font-bold mb-6">Live desks</h1>

            {error && (
                <p className="pb-4 text-sm text-center font-medium text-destructive">
                    {error}
                </p>
            )}

            {isLoading ? (
                <p className="text-sm text-center font-medium text-muted-foreground">
                    Loading live desks...
                </p>
            ) : (
                <>
                    <div className="min-h-0 min-w-0 flex-1 overflow-hidden rounded-md border bg-background max-xl:hidden">
                        <div className={cn("flex flex-col max-xl:hidden xl:flex-row w-full border rounded-lg overflow-hidden bg-background shadow-sm h-150")}>
                            <div className="relative w-150 h-150 bg-slate-100/50 dark:bg-slate-900 overflow-hidden touch-none">
                                {desks.length === 0 && (
                                    <div className="absolute inset-0 flex items-center justify-center text-muted-foreground pointer-events-none">
                                        No desks placed yet.
                                    </div>
                                )}

                                {desks.map((desk) => (
                                    <div
                                        key={desk.id}
                                        className={cn(
                                            "absolute text-center rounded-lg flex items-center justify-center text-sm font-medium shadow-sm select-none",
                                            liveOverlaps.has(desk.id)
                                                ? "bg-red-100 border-2 border-dashed border-red-500 text-red-700 dark:bg-red-900/50 dark:border-red-500/80 dark:text-red-200"
                                                : "bg-white border-2 border-slate-200 text-slate-700 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-200"
                                        )}
                                        style={{
                                            left: desk.x,
                                            top: desk.y,
                                            width: desk.width,
                                            height: desk.height,
                                        }}
                                    >
                                        {desk.data}
                                    </div>
                                ))}
                            </div>

                            <div className="flex-1 w-full xl:w-80 border-l flex flex-col bg-card">
                                <div className="p-4 border-b flex items-center justify-between">
                                    <h2 className="font-semibold text-lg">Live desks</h2>
                                </div>

                                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                                    {desks.length === 0 ? (
                                        <p className="text-sm text-muted-foreground text-center py-4">
                                            No desks placed yet.
                                        </p>
                                    ) : (
                                        desks.map((desk) => (
                                            <div
                                                key={desk.id}
                                                className="p-3 rounded-md border text-sm space-y-2 bg-muted/50"
                                            >
                                                <div className="flex items-center justify-between">
                                                    <span className="font-medium truncate max-w-30">{desk.data}</span>
                                                </div>

                                                <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                                                    <div>X: {Math.round(desk.x)}</div>
                                                    <div>Y: {Math.round(desk.y)}</div>
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                    <div className="mt-4 text-sm text-red-600 text-center xl:hidden">
                        <p>Viewport must be at least 1280px wide</p>
                    </div>
                </>
            )}
        </div>
    )
}