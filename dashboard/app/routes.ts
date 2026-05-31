import { type RouteConfig, index, layout, prefix, route } from "@react-router/dev/routes"

export default [
    layout("./components/auth/public-only-route.tsx", [
        route("login", "routes/login.tsx"),
    ]),
    layout("./components/auth/protected-route.tsx", [
        layout("./routes/dashboard/_layout.tsx", [
            index("routes/dashboard/index.tsx"),
            ...prefix("open-spaces", [
                route("create", "routes/dashboard/open-spaces/create.tsx"),
            ]),
            ...prefix("desks", [
                route("editor", "routes/dashboard/desks/editor.tsx"),
            ]),
            ...prefix("users", [
                route("invite", "routes/dashboard/users/invite.tsx"),
                route("pending", "routes/dashboard/users/pending-invitations.tsx"),
                route("all", "routes/dashboard/users/all-users.tsx"),
            ]),
            ...prefix("settings", [
                index("routes/dashboard/open-spaces/settings.tsx"),
            ])
        ])
    ]),
] satisfies RouteConfig
