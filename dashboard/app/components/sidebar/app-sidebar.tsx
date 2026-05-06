"use client"

import * as React from "react"

import { NavMain } from "~/components/sidebar/nav-main"
import { NavProjects } from "~/components/sidebar/nav-projects"
import { NavUser } from "~/components/sidebar/nav-user"
import { OpenSpaceSwitcher } from "~/components/sidebar/open-space-switcher"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarRail,
} from "~/components/ui/sidebar"
import { GalleryVerticalEndIcon, AudioLinesIcon, TerminalIcon, TerminalSquareIcon, BotIcon, BookOpenIcon, Settings2Icon, FrameIcon, PieChartIcon, MapIcon, Workflow, HomeIcon } from "lucide-react"
import { useAuth } from "~/providers/AuthProvider"

// This is sample data.
const data = {
  teams: [
    {
      name: "PWr D23",
      logo: (
        <GalleryVerticalEndIcon
        />
      ),
      plan: "Standard",
    },
    {
      name: "Grunwaldzki Center",
      logo: (
        <AudioLinesIcon
        />
      ),
      plan: "Standard",
    },
    {
      name: "Globis",
      logo: (
        <TerminalIcon
        />
      ),
      plan: "Standard",
    },
  ],
  navMain: [
    {
      title: "General",
      url: "#",
      icon: (
        <HomeIcon
        />
      ),
      isActive: true,
      items: [
        {
          title: "Home",
          url: "/",
        },
      ],
    },
    {
      title: "Users",
      url: "#",
      icon: (
        <TerminalSquareIcon
        />
      ),
      items: [
        {
          title: "All users",
          url: "#",
        },
        {
          title: "Add user",
          url: "#",
        },
      ],
    },
    {
      title: "Desks",
      url: "#",
      icon: (
        <Workflow />
      ),
      items: [
        {
          title: "Live view",
          url: "#",
        },
        {
          title: "Editor",
          url: "/desks/editor",
        },
      ],
    },
    {
      title: "Reservations",
      url: "#",
      icon: (
        <BookOpenIcon
        />
      ),
      items: [
        {
          title: "All reservations",
          url: "#",
        },
        {
          title: "Calendar",
          url: "#",
        },
        {
          title: "Create reservation",
          url: "#",
        },
      ],
    },
    {
      title: "Settings",
      url: "#",
      icon: (
        <Settings2Icon
        />
      ),
      items: [
        {
          title: "General",
          url: "#",
        },
        {
          title: "Billing",
          url: "#",
        },
        {
          title: "Limits",
          url: "#",
        },
      ],
    },
  ],
  projects: [
    {
      name: "Design Engineering",
      url: "#",
      icon: (
        <FrameIcon
        />
      ),
    },
    {
      name: "Sales & Marketing",
      url: "#",
      icon: (
        <PieChartIcon
        />
      ),
    },
    {
      name: "Travel",
      url: "#",
      icon: (
        <MapIcon
        />
      ),
    },
  ],
}

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const { user } = useAuth();

  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <OpenSpaceSwitcher teams={data.teams} />
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={data.navMain} />
        {/* <NavProjects projects={data.projects} /> */}
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={user} />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}
