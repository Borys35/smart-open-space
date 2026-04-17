import { Skeleton } from "@/components/ui/skeleton"

export function Loading() {
    return (
        <div className="flex w-full gap-4 p-6">
            <div className="grid gap-2">
                <Skeleton className="h-8 w-64" />
                <Skeleton className="h-8 w-48" />
                <Skeleton className="h-16 w-64" />
                <Skeleton className="h-8 w-64" />
                <Skeleton className="h-8 w-24" />
            </div>
        </div>
    )
}
