import { type RouteConfig, index, layout, prefix, route } from "@react-router/dev/routes"

export default [
    index("routes/home.tsx"),
    layout("./components/auth/public-only-route.tsx", [
        route("login", "routes/login.tsx"),
    ]),
    layout("./components/auth/protected-route.tsx", [
        ...prefix("dashboard", [
            index("routes/dashboard/index.tsx"),
        ])
    ]),
] satisfies RouteConfig
