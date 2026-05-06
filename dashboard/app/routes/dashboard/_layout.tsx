import { Outlet, useMatches } from "react-router"
import { AppSidebar } from "~/components/sidebar/app-sidebar"
import {
    Breadcrumb,
    BreadcrumbItem,
    BreadcrumbLink,
    BreadcrumbList,
    BreadcrumbPage,
    BreadcrumbSeparator,
} from "~/components/ui/breadcrumb"
import { Separator } from "~/components/ui/separator"
import {
    SidebarInset,
    SidebarProvider,
    SidebarTrigger,
} from "~/components/ui/sidebar"

export default function DashboardLayout() {
    const matches = useMatches();

    return (
        <SidebarProvider>
            <AppSidebar />
            <SidebarInset>
                <header className="flex h-16 shrink-0 items-center gap-2 transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12">
                    <div className="flex items-center gap-2 px-4">
                        <SidebarTrigger className="-ml-1" />
                        <Separator
                            orientation="vertical"
                            className="data-vertical:h-4 data-vertical:self-auto"
                        />
                        <Breadcrumb>
                            <BreadcrumbList>
                                {/* <BreadcrumbItem className="hidden md:block">
                                    <BreadcrumbLink href="#">
                                        {matches
                                            .filter(
                                                (match: any) =>
                                                    match.handle && match.handle.title,
                                            )
                                            .map((match: any, index) => (
                                                <li key={index}>
                                                    {match.handle.title}
                                                </li>
                                            ))}
                                    </BreadcrumbLink>
                                </BreadcrumbItem>
                                <BreadcrumbSeparator className="hidden md:block" /> */}
                                <BreadcrumbItem>
                                    <BreadcrumbPage>
                                        {matches
                                            .filter(
                                                (match: any) =>
                                                    match.handle && match.handle.title,
                                            )
                                            .map((match: any, index) => (
                                                <li key={index}>
                                                    {match.handle.title}
                                                </li>
                                            ))}</BreadcrumbPage>
                                </BreadcrumbItem>
                            </BreadcrumbList>
                        </Breadcrumb>
                    </div>
                </header>
                <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
                    <Outlet />
                </div>
            </SidebarInset>
        </SidebarProvider>
    )
}
