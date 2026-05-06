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
        ])
    ]),
] satisfies RouteConfig
