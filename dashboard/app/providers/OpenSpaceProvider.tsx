import React, { createContext, useContext, useEffect, useState } from "react";
import { useAuth } from "./AuthProvider";

export type OpenSpace = {
    id: number;
    name: string;
    building: string;
    floor: number;
};

type OpenSpaceContextType = {
    openSpaces: OpenSpace[];
    activeOpenSpace: OpenSpace | null;
    setActiveOpenSpace: (os: OpenSpace) => void;
    reloadOpenSpaces: () => void;
    isLoading: boolean;
};

const OpenSpaceContext = createContext<OpenSpaceContextType | undefined>(undefined);

export function OpenSpaceProvider({ children }: { children: React.ReactNode }) {
    const { user } = useAuth();
    const [openSpaces, setOpenSpaces] = useState<OpenSpace[]>([]);
    const [activeOpenSpace, setActiveOpenSpace] = useState<OpenSpace | null>(null);
    const [isLoading, setIsLoading] = useState(false);

    const reloadOpenSpaces = () => {
        console.log("Reloading open spaces with access token:", user);
        if (!user) {
            setOpenSpaces([]);
            setActiveOpenSpace(null);
            return;
        }
        setIsLoading(true);
        fetch("/api/dashboard/open-spaces", {
            headers: {
                Authorization: `Bearer ${localStorage.getItem("accessToken")}`
            }
        })
            .then(res => res.json())
            .then(data => {
                if (Array.isArray(data)) {
                    setOpenSpaces(data);
                    // Only set active if one isn't already set, or if the active one isn't in the list
                    if (data.length > 0) {
                        setActiveOpenSpace(prev => prev && data.find(os => os.id === prev.id) ? prev : data[0]);
                    } else {
                        setActiveOpenSpace(null);
                    }
                }
            })
            .catch(console.error)
            .finally(() => setIsLoading(false));

    };

    useEffect(() => {
        console.log("Access token or user changed, reloading open spaces");
        reloadOpenSpaces();
    }, [user]);

    return (
        <OpenSpaceContext value={{ openSpaces, activeOpenSpace, setActiveOpenSpace, reloadOpenSpaces, isLoading }}>
            {children}
        </OpenSpaceContext>
    );
}

export function useOpenSpace() {
    const context = useContext(OpenSpaceContext);
    if (context === undefined) {
        throw new Error("useOpenSpace must be used within an OpenSpaceProvider");
    }
    return context;
}
