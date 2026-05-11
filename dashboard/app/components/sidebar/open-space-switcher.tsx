"use client"

import * as React from "react"

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu"
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "~/components/ui/sidebar"
import { ChevronLeft, ChevronRight, ChevronsUpDownIcon, GroupIcon, Plus, PlusIcon } from "lucide-react"
import { useAuth } from "~/providers/AuthProvider"
import { useOpenSpace } from "~/providers/OpenSpaceProvider"
import { OpenSpaceDialog } from "./open-space-dialog"
import { Link } from "react-router"

export function OpenSpaceSwitcher() {
  const { isMobile } = useSidebar()
  const { user } = useAuth();
  const { openSpaces, activeOpenSpace, setActiveOpenSpace } = useOpenSpace();

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton
              size="lg"
              className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
            >
              <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
                <GroupIcon />
              </div>
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-medium">{activeOpenSpace?.name}</span>
                <span className="truncate text-xs">{activeOpenSpace?.building} - {activeOpenSpace?.floor}</span>
              </div>
              <ChevronsUpDownIcon className="ml-auto" />
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className="w-(--radix-dropdown-menu-trigger-width) min-w-56 rounded-lg"
            align="start"
            side={isMobile ? "bottom" : "right"}
            sideOffset={4}
          >
            <DropdownMenuLabel className="text-xs text-muted-foreground">
              Open Spaces
            </DropdownMenuLabel>
            {openSpaces.map((os) => (
              <DropdownMenuItem
                key={os.id}
                onClick={() => setActiveOpenSpace(os)}
                className="gap-2 p-2 cursor-pointer"
              >
                <div className="">
                  <ChevronRight />
                </div>
                {os.name}
              </DropdownMenuItem>
            ))}
            {user?.role === "SUPER_ADMIN" && (
              <>
                <DropdownMenuSeparator />
                <Link to="/open-spaces/create">
                  <DropdownMenuItem className="gap-2 p-2">
                    <div className="flex size-6 items-center justify-center rounded-md border bg-transparent">
                      <Plus className="size-4" />
                    </div>
                    <div className="font-medium text-muted-foreground">Create new</div>
                  </DropdownMenuItem>
                </Link>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  )
}
