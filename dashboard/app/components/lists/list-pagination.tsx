import { Field, FieldLabel } from "@/components/ui/field"
import {
    Pagination,
    PaginationContent,
    PaginationItem,
    PaginationNext,
    PaginationPrevious,
} from "@/components/ui/pagination"
import {
    Select,
    SelectContent,
    SelectGroup,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"

interface ListPaginationProps {
    total: number;
    page: number;
    limit: number;
    onPageChange: (newPage: number) => void;
    onLimitChange?: (newLimit: number) => void;
}


export function ListPagination({ total, page, limit, onPageChange, onLimitChange }: ListPaginationProps) {
    return (
        <div className="flex items-center justify-between gap-4">
            <Field orientation="horizontal" className="w-fit">
                <FieldLabel htmlFor="select-rows-per-page">Rows per page</FieldLabel>
                <Select defaultValue="25" onValueChange={(value) => onLimitChange && onLimitChange(Number(value))}>
                    <SelectTrigger className="w-20" id="select-rows-per-page">
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent align="start">
                        <SelectGroup>
                            <SelectItem value="10">10</SelectItem>
                            <SelectItem value="25">25</SelectItem>
                            <SelectItem value="50">50</SelectItem>
                            <SelectItem value="100">100</SelectItem>
                        </SelectGroup>
                    </SelectContent>
                </Select>
                <p className="text-sm text-muted-foreground">
                    Total: {total}, displaying from {(page - 1) * limit + 1} to {Math.min(page * limit, total)}
                </p>
            </Field>
            <Pagination className="mx-0 w-auto">
                <PaginationContent>
                    <PaginationItem>
                        <PaginationPrevious href="#" />
                    </PaginationItem>
                    <p className="text-sm text-muted-foreground mx-2">
                        Page {page}
                    </p>
                    <PaginationItem>
                        <PaginationNext href="#" />
                    </PaginationItem>
                </PaginationContent>
            </Pagination>
        </div>
    )
}
