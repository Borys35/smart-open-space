import { useEffect } from "react";
import { useNavigate, Outlet, Navigate } from "react-router";
import { useAuth } from "../../providers/AuthProvider";
import { Loading } from "../loading";

export default function ProtectedRoute({ children }: { children: React.ReactNode }) {
    const { user, loading } = useAuth();

    if (loading) {
        return <Loading />;
    }

    if (user) {
        return <Navigate to="/" replace />;
    }
    return <Outlet />;
};