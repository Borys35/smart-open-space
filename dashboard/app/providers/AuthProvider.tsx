import { createContext, useContext, useState, useEffect, useMemo } from "react";
import { Outlet, useNavigate } from "react-router";

export interface UserType {
    name: string;
    email: string;
    role: "SUPER_ADMIN" | "MANAGER" | "USER";
}

interface AuthContextType {
    loading: boolean;
    accessToken?: string;
    user: UserType | null;
    login: (accessToken: string, user: UserType) => Promise<void>;
    logout: () => void;
}

const defaultValue: AuthContextType = {
    loading: true,
    accessToken: undefined,
    user: null,
    login: async () => { },
    logout: () => { }
};

export const AuthContext = createContext(defaultValue);
export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState(defaultValue.user);
    const [accessToken, setAccessToken] = useState<string | undefined>(defaultValue.accessToken);
    const [loading, setLoading] = useState(true);

    // useEffect(() => {
    //     fetch("/api/me", {
    //         credentials: "include",
    //         headers: {
    //             authorization: "Bearer " + localStorage.getItem("accessToken"),
    //         },
    //     })
    //         .then((res) => {
    //             if (!res.ok) {
    //                 throw new Error("Failed to fetch user");
    //             }
    //             return res.json()
    //         })
    //         .then((data) => {
    //             console.log("Fetched user data:", data);
    //             setUser(data);
    //             setLoading(false);
    //         })
    //         .catch((err) => {
    //             localStorage.removeItem("accessToken")
    //             console.error("Failed to fetch user:", err);
    //             setLoading(false);
    //         });
    // }, []);
    useEffect(() => {
        console.log("Checking authentication...");
        const token = localStorage.getItem("accessToken");
        console.log("Access token:", token);
        if (!token) {
            setLoading(false);
            return;
        }
        setUser({
            name: "Super Admin",
            email: "superadmin@test.com",
            role: "SUPER_ADMIN"
        });
        setAccessToken(token);
        setLoading(false);

    }, []);

    const navigate = useNavigate();
    const value = useMemo(() => {
        // call this function when you want to authenticate the user
        const login = async (accessToken: string, user: UserType) => {
            setUser(user);
            localStorage.setItem("accessToken", accessToken); // TODO: to remove when backend is ready (HttpOnly cookie will be used instead)
            navigate("/");
        };

        // call this function to sign out logged in user
        const logout = () => {
            setUser(null);
            localStorage.removeItem("accessToken"); // TODO: to remove when backend is ready (HttpOnly cookie will be used instead)
            navigate("/login", { replace: true });
        };

        return { user, accessToken, login, logout, loading };
    }, [user, accessToken, navigate, setUser, loading]);

    return (
        <AuthContext value={value}>
            {children}
        </AuthContext>
    );
}