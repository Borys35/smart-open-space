"use client"

import { useState, useMemo } from "react";
import { useParams } from "react-router";
import { toast } from "sonner";
import { DesksEditorCanvas, type Desk } from "~/components/desks-editor-canvas";
import { Button } from "~/components/ui/button";

export const handle = {
    title: "Desks Editor",
};

export default function DesksEditor() {
    const { id } = useParams();
    const [desks, setDesks] = useState<Desk[]>([]);
    const [isSaving, setIsSaving] = useState(false);

    const overlappingDesks = useMemo(() => {
        const overlaps = new Set<number>();
        for (let i = 0; i < desks.length; i++) {
            for (let j = i + 1; j < desks.length; j++) {
                const d1 = desks[i];
                const d2 = desks[j];
                if (
                    d1.x < d2.x + d2.width &&
                    d1.x + d1.width > d2.x &&
                    d1.y < d2.y + d2.height &&
                    d1.y + d1.height > d2.y
                ) {
                    overlaps.add(d1.id);
                    overlaps.add(d2.id);
                }
            }
        }
        return overlaps;
    }, [desks]);

    const handleSave = async () => {
        if (overlappingDesks.size > 0) {
            toast.error("Please resolve overlapping desks before saving.");
            return;
        }
        if (!id) {
            toast.error("Open space ID is missing.");
            return;
        }

        setIsSaving(true);

        try {
            const response = await fetch(`/api/dashboard/open-spaces/${id}/desks`, {
                method: "POST",
                credentials: "include",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(desks),
            });

            if (!response.ok) {
                const result = await response.json().catch(() => ({}));
                throw new Error(result.detail || "Failed to save configuration");
            }

            toast.success("Configuration saved successfully!");
        } catch (err: any) {
            toast.error(err.message);
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="flex flex-col h-full w-full p-4 md:p-6 lg:p-8">
            <h1 className="text-2xl font-bold mb-6">Edit Desks Configuration</h1>

            <div className="w-full h-full relative">
                <DesksEditorCanvas
                    desks={desks}
                    setDesks={setDesks}
                    overlappingDesks={overlappingDesks}
                />
            </div>
            <Button
                className="absolute bottom-6 right-6"
                onClick={handleSave}
                disabled={isSaving || overlappingDesks.size > 0}
            >
                {isSaving ? "Saving..." : "Save Configuration"}
            </Button>
        </div>
    )
}
